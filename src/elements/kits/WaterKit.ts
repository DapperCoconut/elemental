import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';
import { Projectile } from '../../combat/Projectile';

// ── Shared Geyser type (exported so ArenaScene can import instead of redefining) ──

export interface Geyser {
  sprite: Phaser.GameObjects.Arc;
  expiresAt: number;
  x: number;
  y: number;
  radius: number;
  owner: 'player' | 'npc';
}

// ── Arena API interface ────────────────────────────────────────────────────────

export interface WaterArenaApi {
  readonly player: Fighter;
  readonly npc: Fighter;
  readonly enemies: Fighter[];
  readonly scene: Phaser.Scene;
  readonly projectiles: Phaser.Physics.Arcade.Group;
  readonly fKey: Phaser.Input.Keyboard.Key;
  readonly geysers: Geyser[];
  readonly nukeChanneling: boolean;
  isPlayerWater(): boolean;
  hasUpgrade(slot: string): boolean;
  hasPerk(owner: 'player' | 'npc', perkId: string): boolean;
  lockCaster(ms: number): void;
  releaseCaster(): void;
  spawnHitFlash(x: number, y: number, color: number): void;
  showFloatingText(x: number, y: number, text: string, color: string): void;
  spawnDamageNumber(x: number, y: number, amount: number): void;
  damagePlayerTargets(cx: number, cy: number, r: number, d: number, color: number): void;
  removeGeyser(g: Geyser): void;
  setPlayerGeyserBuffUntil(t: number): void;
  setNpcGeyserBuffUntil(t: number): void;
}

// ── WaterKit ──────────────────────────────────────────────────────────────────

export class WaterKit {
  // -- Dehydration --
  private dehydration = new Map<Fighter, number>();
  private dehydrationBars = new Map<Fighter, Phaser.GameObjects.Rectangle>();

  // -- Geyser depletion / shared global CD --
  private geyserCharges = new WeakMap<object, number>();
  private lastGeyserUseAt = -Infinity;
  private playerWasInGeyser = false;
  private npcWasInGeyser = false;

  // -- Boiling (player only) --
  private boilStandSince = 0;
  private boilingUntil = 0;
  private boilDmgAccum = 0;
  private boilSteamAccum = 0;

  // -- Pressure Dagger --
  private daggerCharging = false;
  private daggerChargeStart = 0;
  private daggerVisual: Phaser.GameObjects.Arc | null = null;
  private daggerProjs = new Set<Projectile>();
  private daggerHitSets = new WeakMap<Projectile, Set<Fighter>>();
  private daggerLevels = new WeakMap<Projectile, 0 | 1 | 2>();
  private fKeyWasDown = false;

  // -- Laminar Laceration (F+) --
  private splitState: {
    ball1: Phaser.GameObjects.Arc;
    ball2: Phaser.GameObjects.Arc;
    until: number;
    lastHitAt: Map<Projectile, number>;
  } | null = null;

  // track time for methods called outside update()
  private lastTime = 0;

  constructor(private readonly arena: WaterArenaApi) {}

  reset(): void {
    for (const bar of this.dehydrationBars.values()) bar.destroy();
    this.dehydration.clear();
    this.dehydrationBars.clear();

    if (this.boilingUntil > 0 && this.arena.player.active) this.arena.player.clearTint();
    this.boilStandSince = 0;
    this.boilingUntil = 0;
    this.boilDmgAccum = 0;
    this.boilSteamAccum = 0;

    this.daggerCharging = false;
    if (this.daggerVisual) { this.daggerVisual.destroy(); this.daggerVisual = null; }
    for (const p of this.daggerProjs) {
      if (p.active) { p.setActive(false).setVisible(false); (p.body as Phaser.Physics.Arcade.Body).stop(); }
    }
    this.daggerProjs.clear();
    this.fKeyWasDown = false;

    this.clearSplit(false);

    this.lastGeyserUseAt = -Infinity;
    this.playerWasInGeyser = false;
    this.npcWasInGeyser = false;
  }

  update(time: number, delta: number): void {
    this.lastTime = time;
    const { player, npc, geysers, scene, enemies } = this.arena;

    // -- Dehydration bars: update positions each frame --
    for (const [fighter, bar] of this.dehydrationBars) {
      if (!fighter.active) { bar.destroy(); this.dehydrationBars.delete(fighter); continue; }
      const pct = (this.dehydration.get(fighter) ?? 0) / 100;
      const barW = Math.max(0, pct * 44);
      bar.setPosition(fighter.x - 22 + barW / 2, fighter.y - 50);
      bar.setSize(barW, 4);
    }

    // -- Geyser logic (player side) --
    if (this.arena.isPlayerWater()) {
      let currentGeyser: Geyser | null = null;
      for (const g of geysers) {
        if (g.owner === 'player' && Phaser.Math.Distance.Between(g.x, g.y, player.x, player.y) <= g.radius) {
          currentGeyser = g;
          break;
        }
      }
      const inGeyser = currentGeyser !== null;

      if (inGeyser) {
        this.arena.setPlayerGeyserBuffUntil(time + 2000);

        // Entry event: player just stepped in AND global CD expired
        if (!this.playerWasInGeyser && time - this.lastGeyserUseAt >= 2000) {
          this.lastGeyserUseAt = time;
          this.consumeGeyserCharge(currentGeyser!, time);
          // Re-check geyser still exists after charge consumption
          const stillExists = geysers.includes(currentGeyser!);
          if (!stillExists) {
            this.playerWasInGeyser = false;
            this.boilStandSince = 0;
            return;
          }
        }

        // Boiling countdown (R+ upgrade)
        if (this.arena.hasUpgrade('r') && this.boilingUntil <= time) {
          if (!this.boilStandSince) this.boilStandSince = time;
          if (time - this.boilStandSince >= 3000) {
            this.triggerBoiling(currentGeyser!, time, player);
          }
        }
      } else {
        this.boilStandSince = 0;
      }
      this.playerWasInGeyser = inGeyser;

      // -- Boiling tick (steam particles, expiry) --
      if (this.boilingUntil > 0 && time < this.boilingUntil) {
        this.boilSteamAccum += delta;
        if (this.boilSteamAccum >= 120) {
          this.boilSteamAccum = 0;
          const ox = (Math.random() - 0.5) * 16;
          this.arena.spawnHitFlash(player.x + ox, player.y - 8, 0xffffff);
        }
      }

      if (this.boilingUntil > 0 && time >= this.boilingUntil) {
        player.clearTint();
        this.arena.showFloatingText(player.x, player.y - 36, '♨️ Cooled', '#aaccff');
        this.boilingUntil = 0;
        this.boilDmgAccum = 0;
      }
    }

    // -- Geyser logic (NPC side): speed buff only, no charge depletion --
    {
      let npcInGeyser = false;
      for (const g of geysers) {
        if (g.owner === 'npc' && Phaser.Math.Distance.Between(g.x, g.y, npc.x, npc.y) <= g.radius) {
          npcInGeyser = true;
          this.arena.setNpcGeyserBuffUntil(time + 2000);
          break;
        }
      }
      this.npcWasInGeyser = npcInGeyser;
    }

    // -- Pressure dagger: out-of-bounds cleanup --
    const physWorld = (scene as unknown as { physics: { world: Phaser.Physics.Arcade.World } }).physics.world;
    const bounds = physWorld.bounds;
    for (const proj of this.daggerProjs) {
      if (!proj.active) { this.daggerProjs.delete(proj); continue; }
      if (
        proj.x < bounds.x - 60 || proj.x > bounds.right + 60 ||
        proj.y < bounds.y - 60 || proj.y > bounds.bottom + 60
      ) {
        proj.setActive(false).setVisible(false);
        (proj.body as Phaser.Physics.Arcade.Body).stop();
        this.daggerProjs.delete(proj);
      }
    }

    // -- Laminar Laceration split --
    if (this.splitState) {
      if (time >= this.splitState.until || npc.hp <= 0) {
        this.clearSplit(npc.hp > 0 && npc.active);
      } else {
        const { ball1, ball2, lastHitAt } = this.splitState;
        for (const go of this.arena.projectiles.getChildren() as Projectile[]) {
          if (!go.active || !go.isFromPlayer) continue;
          for (const ball of [ball1, ball2]) {
            const dist = Phaser.Math.Distance.Between(go.x, go.y, ball.x, ball.y);
            if (dist <= 26) {
              const lastHit = lastHitAt.get(go) ?? 0;
              if (time - lastHit < 50) continue;
              lastHitAt.set(go, time);
              const dmg = Math.round(go.damage * 1.5 * this.computeOutgoingMultiplier(npc, 'player'));
              npc.takeDamage(dmg);
              this.arena.spawnHitFlash(ball.x, ball.y, 0x0066cc);
              go.setActive(false).setVisible(false);
              (go.body as Phaser.Physics.Arcade.Body).stop();
              this.noteDamageDealtByPlayer(dmg);
            }
          }
        }
      }
    }
  }

  handleInput(time: number, _delta: number, mouseX: number, mouseY: number): void {
    if (!this.arena.isPlayerWater()) return;
    const { fKey, player, scene, projectiles } = this.arena;
    const fKeyDown = fKey.isDown;

    // If nukeChanneling was cleared externally while charging, abort
    if (this.daggerCharging && !this.arena.nukeChanneling) {
      this.daggerCharging = false;
      if (this.daggerVisual) { this.daggerVisual.destroy(); this.daggerVisual = null; }
      player.chargeRatio = 0;
    }

    if (fKeyDown && !this.fKeyWasDown && !this.arena.nukeChanneling) {
      // Begin charging
      this.daggerCharging = true;
      this.daggerChargeStart = time;
      this.arena.lockCaster(99999);
      this.daggerVisual = scene.add.circle(player.x, player.y, 10, 0x4488ff, 0.7).setDepth(15);
    }

    if (this.daggerCharging) {
      const held = time - this.daggerChargeStart;
      const chargeRatio = Math.min(1, held / 2000);
      player.chargeRatio = chargeRatio;

      if (this.daggerVisual) {
        this.daggerVisual.setPosition(player.x, player.y);
        const level = held >= 2000 ? 2 : held >= 1000 ? 1 : 0;
        const col = level === 2 ? 0x002266 : level === 1 ? 0x004488 : 0x4488ff;
        this.daggerVisual.setFillStyle(col, 0.7);
        this.daggerVisual.setRadius(10 + level * 4);
      }

      if (!fKeyDown && this.fKeyWasDown) {
        // Release — fire
        this.daggerCharging = false;
        player.chargeRatio = 0;
        if (this.daggerVisual) { this.daggerVisual.destroy(); this.daggerVisual = null; }
        this.arena.releaseCaster();

        const held2 = time - this.daggerChargeStart;
        const level = (held2 >= 2000 ? 2 : held2 >= 1000 ? 1 : 0) as 0 | 1 | 2;
        const mult = level === 2 ? 2 : level === 1 ? 1.5 : 1;
        const baseDmg = Math.round(16 * mult);

        const dx = mouseX - player.x;
        const dy = mouseY - player.y;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        const speed = 700;
        const spawnDist = 32;

        const proj = new Projectile(
          scene,
          player.x + (dx / len) * spawnDist,
          player.y + (dy / len) * spawnDist,
          'proj-pressure-dagger',
          baseDmg,
          true,
        );

        const tintColor = level === 2 ? 0x002266 : level === 1 ? 0x0044aa : 0x4488ff;
        proj.setTint(tintColor);
        proj.setRotation(Math.atan2(dy, dx));
        (proj as any).pierceShield = true;
        (proj as any).baseDmg = baseDmg;

        projectiles.add(proj);
        proj.launch((dx / len) * speed, (dy / len) * speed);

        this.daggerProjs.add(proj);
        this.daggerHitSets.set(proj, new Set<Fighter>());
        this.daggerLevels.set(proj, level);

        player.triggerCooldown('pressure-dagger');
      }
    }

    this.fKeyWasDown = fKeyDown;
  }

  handleNpcCastId(_id: string | null, _time: number): void {
    // No NPC reactions needed for water currently
  }

  // Called from applyProjectileToNpc when proj-pressure-dagger (player-fired) hits NPC
  onDaggerHitNpc(proj: Projectile, target: Fighter): void {
    const hitSet = this.daggerHitSets.get(proj);
    if (!hitSet || hitSet.has(target)) return;
    hitSet.add(target);

    const baseDmg = ((proj as any).baseDmg as number) ?? proj.damage;
    const totalDmg = Math.round(baseDmg * this.computeOutgoingMultiplier(target, 'player'));
    target.takeDamage(totalDmg, { pierce: true });
    this.arena.spawnHitFlash(target.x, target.y, 0x002266);
    this.arena.showFloatingText(target.x, target.y - 30, '💧 PIERCE!', '#88ccff');
    this.noteDamageDealtByPlayer(totalDmg);

    const level = this.daggerLevels.get(proj) ?? 0;
    if (this.arena.hasUpgrade('f') && level === 2 && !this.splitState && target === this.arena.npc) {
      this.startSplit(target, this.lastTime);
    }
    // Projectile is NOT deactivated — kit's update() handles out-of-bounds cleanup
  }

  // Called from applyProjectileToCorrupted for player-fired dagger
  onDaggerHitCorrupted(proj: Projectile, target: Fighter): void {
    const hitSet = this.daggerHitSets.get(proj);
    if (!hitSet || hitSet.has(target)) return;
    hitSet.add(target);

    const baseDmg = ((proj as any).baseDmg as number) ?? proj.damage;
    const totalDmg = Math.round(baseDmg * this.computeOutgoingMultiplier(target, 'player'));
    target.takeDamage(totalDmg, { pierce: true });
    this.arena.spawnHitFlash(target.x, target.y, 0x002266);
    this.noteDamageDealtByPlayer(totalDmg);
    // projectile keeps going
  }

  // Called from water-cut hit path in applyProjectileToNpc
  onWaterCutHit(target: Fighter, _attacker: 'player' | 'npc'): void {
    if (!this.arena.hasUpgrade('click')) return;
    this.applyDehydration(target, 2);
  }

  // Called from pain rain impact tick — returns true if boiling consumed the drop
  onPainRainDropImpact(x: number, y: number): boolean {
    if (this.boilingUntil <= 0 || this.lastTime >= this.boilingUntil) return false;

    // Steam blast instead of normal rain damage
    this.arena.damagePlayerTargets(x, y, 36, 5, 0xffffff);

    // White ring visual
    const ring = this.arena.scene.add.circle(x, y, 8, 0xffffff, 0.8).setDepth(9);
    this.arena.scene.tweens.add({ targets: ring, scaleX: 4, scaleY: 4, alpha: 0, duration: 300, onComplete: () => ring.destroy() });
    this.arena.showFloatingText(x, y - 12, '♨️', '#ffffff');

    // Apply +3% dehydration to enemies in radius
    for (const enemy of this.arena.enemies) {
      if (!enemy.active || enemy.hp <= 0) continue;
      if (Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y) <= 36) {
        this.applyDehydration(enemy, 3);
      }
    }

    return true;
  }

  onFighterDefeated(f: Fighter): void {
    const bar = this.dehydrationBars.get(f);
    if (bar) { bar.destroy(); this.dehydrationBars.delete(f); }
    this.dehydration.delete(f);

    if (this.splitState && f === this.arena.npc) {
      this.clearSplit(false);
    }
  }

  // Called after a new geyser is pushed to arena.geysers — registers 2 charges
  registerGeyser(g: Geyser): void {
    this.geyserCharges.set(g, 2);
  }

  // Called from water damage paths to track boiling extension
  noteDamageDealtByPlayer(amount: number): void {
    if (this.boilingUntil <= 0 || this.lastTime >= this.boilingUntil) return;
    this.boilDmgAccum += amount;
    while (this.boilDmgAccum >= 50) {
      this.boilingUntil += 2000;
      this.boilDmgAccum -= 50;
      this.arena.showFloatingText(this.arena.player.x, this.arena.player.y - 42, '♨️ +2s', '#aaffff');
    }
  }

  // Called from applyProjectileToNpc for water-cut damage with multiplier
  computeOutgoingMultiplier(target: Fighter, attacker: 'player' | 'npc'): number {
    if (attacker !== 'player') return 1;
    const dehyd = this.dehydration.get(target) ?? 0;
    const dehydMult = Math.min(1.5, 1 + 0.05 * Math.floor(dehyd / 10));
    const boilMult = this.isPlayerBoiling(this.lastTime) ? 1.25 : 1;
    return dehydMult * boilMult;
  }

  isPlayerBoiling(time: number): boolean {
    return this.boilingUntil > 0 && time < this.boilingUntil;
  }

  isNpcSplit(): boolean {
    return this.splitState !== null;
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private applyDehydration(target: Fighter, amount: number): void {
    const curr = this.dehydration.get(target) ?? 0;
    const next = Math.min(100, curr + amount);
    this.dehydration.set(target, next);
    this.updateDehydrationBar(target, next);
  }

  private updateDehydrationBar(target: Fighter, pct: number): void {
    const scene = this.arena.scene;
    if (pct <= 0) {
      const bar = this.dehydrationBars.get(target);
      if (bar) { bar.destroy(); this.dehydrationBars.delete(target); }
      return;
    }
    let bar = this.dehydrationBars.get(target);
    if (!bar) {
      bar = scene.add.rectangle(target.x, target.y - 50, 1, 4, 0xffffff, 1).setDepth(20).setOrigin(0.5);
      this.dehydrationBars.set(target, bar);
    }
    const barW = Math.max(0, (pct / 100) * 44);
    bar.setPosition(target.x - 22 + barW / 2, target.y - 50);
    bar.setSize(barW, 4);
  }

  private consumeGeyserCharge(g: Geyser, time: number): void {
    const charges = ((this.geyserCharges.get(g) as number) ?? 2) - 1;
    this.geyserCharges.set(g, charges);

    if (charges === 1) {
      g.sprite.setScale(0.65);
      g.radius = Math.round(g.radius * 0.65);
      this.arena.showFloatingText(g.x, g.y - 20, '🌊 WEAK', '#55ccaa');
    } else if (charges <= 0) {
      this.arena.removeGeyser(g);
      this.arena.showFloatingText(g.x, g.y - 20, '💧 DEPLETED', '#55aaaa');
    }
    void time;
  }

  private triggerBoiling(g: Geyser, time: number, player: Fighter): void {
    this.boilingUntil = time + 5000;
    this.boilStandSince = 0;
    this.boilDmgAccum = 0;
    this.arena.removeGeyser(g);
    player.setTint(0xffffff);
    this.arena.showFloatingText(player.x, player.y - 36, '♨️ BOILING!', '#ffffff');
  }

  private startSplit(npc: Fighter, time: number): void {
    const scene = this.arena.scene;
    npc.setVisible(false);
    (npc.body as Phaser.Physics.Arcade.Body).enable = false;

    const ball1 = scene.add.circle(npc.x - 24, npc.y, 18, 0x0066cc, 0.9).setDepth(6);
    const ball2 = scene.add.circle(npc.x + 24, npc.y, 18, 0x0066cc, 0.9).setDepth(6);

    [ball1, ball2].forEach(b => {
      scene.tweens.add({ targets: b, scaleX: 1.15, scaleY: 1.15, yoyo: true, repeat: -1, duration: 400 });
    });

    this.splitState = { ball1, ball2, until: time + 2000, lastHitAt: new Map() };
    this.arena.showFloatingText(npc.x, npc.y - 36, '💧 SPLIT!', '#88ccff');
  }

  private clearSplit(restoreNpc: boolean): void {
    if (!this.splitState) return;
    this.splitState.ball1.destroy();
    this.splitState.ball2.destroy();
    this.splitState = null;

    if (restoreNpc) {
      const npc = this.arena.npc;
      npc.setVisible(true);
      (npc.body as Phaser.Physics.Arcade.Body).enable = true;
      this.arena.showFloatingText(npc.x, npc.y - 36, '💧 MERGED', '#88ccff');
    }
  }
}
