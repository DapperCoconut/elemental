import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';
import { Projectile } from '../../combat/Projectile';

// ── Arena API ────────────────────────────────────────────────────────────────

export interface OilArenaApi {
  get player(): Fighter;
  get npc(): Fighter;
  get scene(): Phaser.Scene;
  get pointer(): Phaser.Input.Pointer;
  get eKey(): Phaser.Input.Keyboard.Key;
  get rKey(): Phaser.Input.Keyboard.Key;
  get fKey(): Phaser.Input.Keyboard.Key;
  get qKey(): Phaser.Input.Keyboard.Key;
  get wKey(): Phaser.Input.Keyboard.Key;
  get aKey(): Phaser.Input.Keyboard.Key;
  get sKey(): Phaser.Input.Keyboard.Key;
  get dKey(): Phaser.Input.Keyboard.Key;
  get projectiles(): Phaser.Physics.Arcade.Group;
  get nukeChanneling(): boolean;
  set nukeChanneling(v: boolean);
  get nukeChannelEnd(): number;
  set nukeChannelEnd(v: number);
  get npcNukeChanneling(): boolean;
  set npcNukeChanneling(v: boolean);
  get npcNukeChannelEnd(): number;
  set npcNukeChannelEnd(v: number);
  get p2LastAimX(): number;
  get p2LastAimY(): number;
  hasUpgrade(slot: string): boolean;
  spawnHitFlash(x: number, y: number, color: number): void;
  showFloatingText(x: number, y: number, text: string, color: string): void;
  damagePlayerTargets(cx: number, cy: number, radius: number, damage: number, color: number): void;
  damageNpcTarget(cx: number, cy: number, radius: number, damage: number): void;
  pointToSegmentDist(px: number, py: number, ax: number, ay: number, bx: number, by: number): number;
  getSceneWidth(): number;
  getSceneHeight(): number;
}

// ── Internal types ───────────────────────────────────────────────────────────

interface Drone {
  sprite: Phaser.GameObjects.Arc;
  shotsLeft: number;
  orbitAngle: number;
  shielded: boolean;
  healedByFirewall: boolean;
  meleeCooldownUntil: number;
  owner: 'player' | 'npc';
}

interface OilPuddle {
  sprite: Phaser.GameObjects.Arc;
  x: number;
  y: number;
  expiresAt: number;
  ignited: boolean;
  igniteTickAccum: number;
  radius: number;
  oilyTickAccum: number;
  owner: 'player' | 'npc';
}

interface OilFirewall {
  sprite: Phaser.GameObjects.Rectangle;
  x: number;
  y: number;
  angle: number;
  hp: number;
  owner: 'player' | 'npc';
}

interface OilBarrel {
  gfx: Phaser.GameObjects.Arc;
  x: number;
  y: number;
  vx: number;
  vy: number;
  targetX: number;
  targetY: number;
  distTraveled: number;
  lastPuddleDist: number;
  owner: 'player' | 'npc';
  active: boolean;
}

interface ShieldGenerator {
  gfx: Phaser.GameObjects.Graphics;
  laserGfx: Phaser.GameObjects.Graphics;
  x: number;
  y: number;
  charged: boolean;
  chargedUntil: number;
  owner: 'player' | 'npc';
}

interface TrainSegment {
  x: number;
  y: number;
  lastHitAt: number;
}

interface CoalPickup {
  gfx: Phaser.GameObjects.Arc;
  x: number;
  y: number;
  collected: boolean;
}

// ── OilKit ───────────────────────────────────────────────────────────────────

export class OilKit {
  private arena: OilArenaApi;

  // Drones
  private playerDrones: Drone[] = [];
  private npcDrones: Drone[] = [];

  // Firewalls (legacy F — kept for NPC, replaced for player by shield gen)
  private npcFirewall: OilFirewall | null = null;

  // Overdrive (legacy Q)
  private playerOverdriveActive = false;
  private playerOverdriveEnd = 0;
  private playerOverdriveAngle = 0;
  private playerOverdriveTickAccum = 0;
  private playerOverdriveGfx: Phaser.GameObjects.Graphics | null = null;
  private playerOverdriveDroneCount = 0;
  private npcOverdriveActive = false;
  private npcOverdriveEnd = 0;
  private npcOverdriveAngle = 0;
  private npcOverdriveTickAccum = 0;
  private npcOverdriveGfx: Phaser.GameObjects.Graphics | null = null;

  // Oil puddles
  private playerOilPuddles: OilPuddle[] = [];
  private npcOilPuddles: OilPuddle[] = [];

  // Click hold detection
  private pointerWasDown = false;
  private pointerDownAt = 0;
  private holdDroneAccum = 0;
  private holdModeActive = false;

  // Drone orbit shared angles
  private playerDroneBaseAngle = 0;
  private npcDroneBaseAngle = 0;

  // Oily visual auras
  private playerOilyAura: Phaser.GameObjects.Arc | null = null;
  private npcOilyAura: Phaser.GameObjects.Arc | null = null;

  // Barrel (E revamp)
  private playerBarrel: OilBarrel | null = null;
  private npcBarrel: OilBarrel | null = null;

  // Shield Generator (F revamp)
  private playerShieldGen: ShieldGenerator | null = null;

  // Train Morph (Q revamp)
  private playerTrainActive = false;
  private playerTrainEndsAt = 0;
  private playerTrainDirX = 1;
  private playerTrainDirY = 0;
  private playerTrainSegments: TrainSegment[] = [];
  private playerTrainPosHistory: { x: number; y: number }[] = [];
  private playerTrainPuddleAccum = 0;
  private playerTrainHitAccum = 0;
  private playerTrainDamageMult = 1;
  private playerTrainCollectedCoal = 0;
  private coalPickups: CoalPickup[] = [];
  private playerTrainGfx: Phaser.GameObjects.Graphics | null = null;
  private trainSpeedBonus = 1;
  private trainDamageMult = 1;
  private trainQPlusActive = false;

  // Oily burn tracking
  private npcOilyBurnAccum = 0;
  private playerOilyBurnAccum = 0;

  constructor(arena: OilArenaApi) {
    this.arena = arena;
  }

  reset(): void {
    // Destroy all sprites
    for (const d of this.playerDrones) d.sprite.destroy();
    for (const d of this.npcDrones) d.sprite.destroy();
    this.playerDrones = [];
    this.npcDrones = [];

    for (const p of this.playerOilPuddles) p.sprite.destroy();
    for (const p of this.npcOilPuddles) p.sprite.destroy();
    this.playerOilPuddles = [];
    this.npcOilPuddles = [];

    if (this.npcFirewall) { this.npcFirewall.sprite.destroy(); this.npcFirewall = null; }

    if (this.playerOverdriveGfx) { this.playerOverdriveGfx.destroy(); this.playerOverdriveGfx = null; }
    if (this.npcOverdriveGfx) { this.npcOverdriveGfx.destroy(); this.npcOverdriveGfx = null; }
    this.playerOverdriveActive = false;
    this.npcOverdriveActive = false;

    if (this.playerBarrel) { this.playerBarrel.gfx.destroy(); this.playerBarrel = null; }
    if (this.npcBarrel) { this.npcBarrel.gfx.destroy(); this.npcBarrel = null; }

    if (this.playerShieldGen) { this.playerShieldGen.gfx.destroy(); this.playerShieldGen.laserGfx.destroy(); this.playerShieldGen = null; }

    this.clearTrain();
    this.pointerWasDown = false;
    this.holdDroneAccum = 0;
    this.holdModeActive = false;
    this.playerDroneBaseAngle = 0;
    this.npcDroneBaseAngle = 0;
    this.npcOilyBurnAccum = 0;
    this.playerOilyBurnAccum = 0;
    this.trainSpeedBonus = 1;
    this.trainDamageMult = 1;
    this.trainQPlusActive = false;
    if (this.playerOilyAura) { this.playerOilyAura.destroy(); this.playerOilyAura = null; }
    if (this.npcOilyAura) { this.npcOilyAura.destroy(); this.npcOilyAura = null; }
  }

  // ── Public accessors ──────────────────────────────────────────────────────

  getPlayerDroneCount(): number { return this.playerDrones.length; }
  getNpcDroneCount(): number { return this.npcDrones.length; }
  isPlayerOverdriving(): boolean { return this.playerOverdriveActive; }
  isPlayerTrainActive(): boolean { return this.playerTrainActive; }

  getPlayerSpeedMult(): number {
    const time = this.arena.scene.time.now;
    let mult = 1;
    // Train bonus
    if (this.playerTrainActive) mult *= this.trainSpeedBonus;
    // Puddle slow on player
    if (this.npcOilPuddles.some(p => Phaser.Math.Distance.Between(p.x, p.y, this.arena.player.x, this.arena.player.y) <= p.radius)) {
      mult *= 0.8;
    }
    // Oily slow
    const player = this.arena.player;
    if (player.oilyUntil > time) mult *= 0.75;
    return mult;
  }

  getNpcSpeedMult(): number {
    const time = this.arena.scene.time.now;
    let mult = 1;
    if (this.playerOilPuddles.some(p => Phaser.Math.Distance.Between(p.x, p.y, this.arena.npc.x, this.arena.npc.y) <= p.radius)) {
      mult *= 0.8;
    }
    const npc = this.arena.npc;
    if (npc.oilyUntil > time) mult *= 0.75;
    return mult;
  }

  // ── Player input ──────────────────────────────────────────────────────────

  handleInput(time: number, delta: number, pointer: Phaser.Input.Pointer, mx: number, my: number): void {
    if (this.arena.nukeChanneling && !this.playerOverdriveActive) return;
    if (this.playerTrainActive) {
      this.handleTrainInput();
      return;
    }

    const player = this.arena.player;

    // Click: hold-to-spawn or single tap to commandDrones
    if (pointer.isDown && !this.pointerWasDown) {
      this.pointerDownAt = time;
      this.holdDroneAccum = 0;
      this.holdModeActive = false;
    }
    if (pointer.isDown) {
      const held = time - this.pointerDownAt;
      if (held >= 300) {
        if (!this.holdModeActive) {
          this.holdModeActive = true;
          this.holdDroneAccum = 500; // first spawn at 0.5s after hold threshold
        }
        this.holdDroneAccum += delta;
        if (this.holdDroneAccum >= 1000) {
          this.holdDroneAccum -= 1000;
          this.doSpawnDrone('player');
        }
      }
    }
    if (!pointer.isDown && this.pointerWasDown) {
      const held = time - this.pointerDownAt;
      if (held < 300) {
        // Short tap: command drones or barrel-explode
        if (this.playerBarrel?.active) {
          this.explodeBarrel(this.playerBarrel, 'player', true);
          this.playerBarrel = null;
        } else {
          this.doCommandDrones(mx, my, 'player');
        }
      }
    }
    this.pointerWasDown = pointer.isDown;

    // E: On a Roll (barrel)
    if (Phaser.Input.Keyboard.JustDown(this.arena.eKey)) {
      if (player.getCooldownRatio('barrel-roll') >= 1) {
        if (this.playerBarrel?.active) {
          this.explodeBarrel(this.playerBarrel, 'player', false);
          this.playerBarrel = null;
        }
        this.doLaunchBarrel(mx, my, 'player');
        player.startCooldown('barrel-roll');
      }
    }

    // R: Drone Destroy (unchanged)
    if (Phaser.Input.Keyboard.JustDown(this.arena.rKey)) {
      if (player.getCooldownRatio('drone-destroy') >= 1 && this.playerDrones.length > 0) {
        this.doLaunchDrone(mx, my, 'player');
        player.startCooldown('drone-destroy');
      }
    }

    // F: Shield Generator
    if (Phaser.Input.Keyboard.JustDown(this.arena.fKey)) {
      if (player.getCooldownRatio('shield-gen') >= 1) {
        this.doPlaceShieldGen(mx, my, 'player');
        player.startCooldown('shield-gen');
      }
    }

    // Q: Train Morph
    if (Phaser.Input.Keyboard.JustDown(this.arena.qKey)) {
      if (player.getCooldownRatio('train-morph') >= 1 && !this.playerTrainActive) {
        this.doStartTrainMorph('player');
      }
    }
  }

  private handleTrainInput(): void {
    const wKey = this.arena.wKey;
    const aKey = this.arena.aKey;
    const sKey = this.arena.sKey;
    const dKey = this.arena.dKey;
    if (Phaser.Input.Keyboard.JustDown(wKey)) { this.playerTrainDirX = 0; this.playerTrainDirY = -1; }
    if (Phaser.Input.Keyboard.JustDown(sKey)) { this.playerTrainDirX = 0; this.playerTrainDirY = 1; }
    if (Phaser.Input.Keyboard.JustDown(aKey)) { this.playerTrainDirX = -1; this.playerTrainDirY = 0; }
    if (Phaser.Input.Keyboard.JustDown(dKey)) { this.playerTrainDirX = 1; this.playerTrainDirY = 0; }
  }

  // ── Per-frame update ──────────────────────────────────────────────────────

  update(time: number, delta: number, isPlayer: boolean, isNpc: boolean, mouseX: number, mouseY: number): void {
    const dt = delta / 1000;

    if (isPlayer) {
      this.updateDroneOrbits(this.playerDrones, this.arena.player, 'player', time, delta);
      this.updateOilPuddles(this.playerOilPuddles, time, delta, 'player');
      this.updatePlayerOverdrive(time, delta, mouseX, mouseY);
      this.updateBarrel(this.playerBarrel, time, dt, 'player');
      this.updateShieldGen(time);
      this.updateTrain(time, delta);
    }
    if (isNpc) {
      this.updateDroneOrbits(this.npcDrones, this.arena.npc, 'npc', time, delta);
      this.updateOilPuddles(this.npcOilPuddles, time, delta, 'npc');
      this.updateNpcOverdrive(time, delta);
      this.updateBarrel(this.npcBarrel, time, dt, 'npc');
      this.updateNpcFirewall();
    }
    // Always tick oily burns and visuals for both fighters regardless of which side uses oil
    this.updateOilyBurn(time, delta, 'player');
    this.updateOilyBurn(time, delta, 'npc');
    this.updateOilyVisual('player', time);
    this.updateOilyVisual('npc', time);
  }

  // ── Drones ────────────────────────────────────────────────────────────────

  private updateDroneOrbits(drones: Drone[], caster: Fighter, owner: 'player' | 'npc', time: number, delta: number): void {
    const count = drones.length;
    const orbitR = Math.max(60, 40 + count * 8);
    const maxDrones = owner === 'player' ? 6 : 4;

    // Advance shared base angle so all drones rotate together
    if (owner === 'player') {
      this.playerDroneBaseAngle += delta * 0.0025;
    } else {
      this.npcDroneBaseAngle += delta * 0.0025;
    }
    const baseAngle = owner === 'player' ? this.playerDroneBaseAngle : this.npcDroneBaseAngle;

    for (let di = 0; di < count; di++) {
      const drone = drones[di];
      const angle = baseAngle + (di * Math.PI * 2 / Math.max(1, count));
      drone.sprite.setPosition(
        caster.x + Math.cos(angle) * orbitR,
        caster.y + Math.sin(angle) * orbitR,
      );
      const col = drone.shotsLeft >= 3 ? 0xffaa00 : drone.shotsLeft === 2 ? 0xff6600 : 0xff2200;
      const rad = drone.shotsLeft >= 3 ? 8 : drone.shotsLeft === 2 ? 7 : 5;
      drone.sprite.setFillStyle(col, owner === 'player' ? 0.9 : 0.7);
      drone.sprite.setRadius(rad);
    }

    // E upgrade (now bundled in Click+): drone melee
    if (owner === 'player' && this.arena.hasUpgrade('click') && !this.playerTrainActive) {
      for (const drone of drones) {
        if (time >= drone.meleeCooldownUntil) {
          const npc = this.arena.npc;
          if (npc.hp > 0 && Phaser.Math.Distance.Between(drone.sprite.x, drone.sprite.y, npc.x, npc.y) <= 25) {
            this.arena.damagePlayerTargets(drone.sprite.x, drone.sprite.y, 25, 5, 0xffaa00);
            drone.meleeCooldownUntil = time + 1000;
          }
        }
      }
    }

    // Remove 0-shot drones
    for (let di = drones.length - 1; di >= 0; di--) {
      if (drones[di].shotsLeft <= 0) {
        drones[di].sprite.destroy();
        drones.splice(di, 1);
      }
    }

    void maxDrones;
  }

  doSpawnDrone(owner: 'player' | 'npc'): void {
    const drones = owner === 'player' ? this.playerDrones : this.npcDrones;
    const caster = owner === 'player' ? this.arena.player : this.arena.npc;
    const maxDrones = owner === 'player' ? 6 : 4;
    if (drones.length >= maxDrones) return;
    const count = drones.length;
    const spawnAngle = (count / maxDrones) * Math.PI * 2;
    const sprite = this.arena.scene.add.circle(
      caster.x + Math.cos(spawnAngle) * 60,
      caster.y + Math.sin(spawnAngle) * 60,
      8, 0xffaa00, 0.9,
    ).setDepth(8);
    drones.push({ sprite, shotsLeft: 3, orbitAngle: spawnAngle, shielded: false, healedByFirewall: false, meleeCooldownUntil: 0, owner });
  }

  doCommandDrones(tx: number, ty: number, owner: 'player' | 'npc'): void {
    const drones = owner === 'player' ? this.playerDrones : this.npcDrones;
    const scene = this.arena.scene;
    const hasClickPlus = owner === 'player' && this.arena.hasUpgrade('click');
    const ePlus = owner === 'player' && this.arena.hasUpgrade('e');
    const rUpgrade = owner === 'player' && this.arena.hasUpgrade('r');

    for (const drone of drones) {
      const laser = scene.add.graphics().setDepth(8);
      laser.lineStyle(2, 0xffaa00, 0.8);
      laser.lineBetween(drone.sprite.x, drone.sprite.y, tx, ty);
      scene.tweens.add({ targets: laser, alpha: 0, duration: 220, onComplete: () => laser.destroy() });

      if (owner === 'player') {
        this.arena.damagePlayerTargets(tx, ty, 40, 3, 0xffaa00);
        // Check oily + click hit
        if (ePlus) {
          const npc = this.arena.npc;
          if (npc.hp > 0 && npc.oilyUntil > scene.time.now &&
              Phaser.Math.Distance.Between(tx, ty, npc.x, npc.y) <= 40) {
            npc.oilyUntil = 0;
            npc.oilyBurnUntil = scene.time.now + 5000;
            npc.oilyBurnAccum = 0;
            this.arena.showFloatingText(npc.x, npc.y - 30, 'Ignited!', '#ff6600');
          }
        }
        // Shield generator recharge check
        if (this.playerShieldGen && !this.playerShieldGen.charged) {
          const genDist = Phaser.Math.Distance.Between(tx, ty, this.playerShieldGen.x, this.playerShieldGen.y);
          if (genDist <= 60) {
            this.playerShieldGen.charged = true;
            this.playerShieldGen.chargedUntil = scene.time.now + 5000;
            this.arena.showFloatingText(this.playerShieldGen.x, this.playerShieldGen.y - 20, 'Recharged!', '#44aacc');
            this.drawShieldGenGfx(this.playerShieldGen);
          }
        }
      } else {
        // NPC drones damage player
        const player = this.arena.player;
        if (player.hp > 0 && Phaser.Math.Distance.Between(drone.sprite.x, drone.sprite.y, player.x, player.y) <= 40) {
          player.takeDamage(3);
          this.arena.spawnHitFlash(player.x, player.y, 0xffaa00);
        }
      }

      drone.shotsLeft -= 1;

      // Destroy enemy projectiles along laser path
      if (owner === 'player') {
        for (const go of this.arena.projectiles.getChildren()) {
          const proj = go as Projectile;
          if (!proj.active || proj.isFromPlayer) continue;
          if (this.arena.pointToSegmentDist(proj.x, proj.y, drone.sprite.x, drone.sprite.y, tx, ty) <= 14) {
            proj.setActive(false).setVisible(false);
            (proj.body as Phaser.Physics.Arcade.Body).stop();
          }
        }
      }

      // Ignite puddles (R upgrade)
      if (rUpgrade && owner === 'player') {
        for (const p of this.playerOilPuddles) {
          if (!p.ignited && Phaser.Math.Distance.Between(tx, ty, p.x, p.y) <= p.radius + 20) {
            p.ignited = true;
            const remaining = p.expiresAt - scene.time.now;
            p.expiresAt = scene.time.now + remaining * 0.5;
            p.sprite.setFillStyle(0xff4400, 0.65);
          }
        }
      }
    }

    // Bomb 0-shot drones (Click+ upgrade)
    for (let di = drones.length - 1; di >= 0; di--) {
      if (drones[di].shotsLeft <= 0) {
        const dead = drones[di];
        const spawnX = dead.sprite.x, spawnY = dead.sprite.y;
        dead.sprite.destroy();
        drones.splice(di, 1);
        if (hasClickPlus && owner === 'player') {
          const bomb = this.arena.scene.add.circle(spawnX, spawnY, 7, 0xff6600, 0.9).setDepth(9);
          this.arena.scene.tweens.add({
            targets: bomb, x: tx, y: ty, duration: 400, ease: 'Power2',
            onComplete: () => {
              const boom = this.arena.scene.add.circle(tx, ty, 8, 0xff6600, 0.9).setDepth(8);
              this.arena.scene.tweens.add({ targets: boom, scaleX: 8, scaleY: 8, alpha: 0, duration: 400, onComplete: () => boom.destroy() });
              bomb.destroy();
              this.arena.damagePlayerTargets(tx, ty, 60, 5, 0xff6600);
            },
          });
        }
      }
    }
  }

  doLaunchDrone(tx: number, ty: number, owner: 'player' | 'npc'): void {
    const drones = owner === 'player' ? this.playerDrones : this.npcDrones;
    if (drones.length === 0) return;
    const drone = drones.pop()!;
    const dmg = Math.max(5, drone.shotsLeft * 5);
    const scene = this.arena.scene;
    scene.tweens.add({
      targets: drone.sprite, x: tx, y: ty, duration: 500, ease: 'Power2',
      onComplete: () => {
        const boom = scene.add.circle(tx, ty, 8, 0xff6600, 0.9).setDepth(8);
        scene.tweens.add({ targets: boom, scaleX: 8, scaleY: 8, alpha: 0, duration: 400, onComplete: () => boom.destroy() });
        drone.sprite.destroy();
        if (owner === 'player') {
          this.arena.damagePlayerTargets(tx, ty, 60, dmg, 0xff6600);
          if (this.arena.hasUpgrade('r')) this.spawnOilPuddle(tx, ty, 'player');
        } else {
          const player = this.arena.player;
          if (player.hp > 0 && Phaser.Math.Distance.Between(tx, ty, player.x, player.y) <= 60) {
            player.takeDamage(dmg);
            this.arena.spawnHitFlash(player.x, player.y, 0xff6600);
          }
        }
      },
    });
  }

  // ── Barrel (E revamp) ─────────────────────────────────────────────────────

  doLaunchBarrel(tx: number, ty: number, owner: 'player' | 'npc'): void {
    const caster = owner === 'player' ? this.arena.player : this.arena.npc;
    const angle = Math.atan2(ty - caster.y, tx - caster.x);
    const speed = 300;
    const gfx = this.arena.scene.add.circle(caster.x, caster.y, 20, 0x3d1c02, 0.9)
      .setStrokeStyle(3, 0x7a3b10)
      .setDepth(8);
    const barrel: OilBarrel = {
      gfx, x: caster.x, y: caster.y,
      vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
      targetX: tx, targetY: ty,
      distTraveled: 0, lastPuddleDist: 0,
      owner, active: true,
    };
    if (owner === 'player') this.playerBarrel = barrel;
    else this.npcBarrel = barrel;
  }

  private updateBarrel(barrel: OilBarrel | null, time: number, dt: number, owner: 'player' | 'npc'): void {
    if (!barrel || !barrel.active) return;
    const MARGIN = 36;
    const W = this.arena.getSceneWidth();
    const H = this.arena.getSceneHeight();

    const prevX = barrel.x, prevY = barrel.y;
    barrel.x += barrel.vx * dt;
    barrel.y += barrel.vy * dt;
    barrel.distTraveled += Math.sqrt((barrel.x - prevX) ** 2 + (barrel.y - prevY) ** 2);

    // Explode on wall contact
    if (barrel.x <= MARGIN || barrel.x >= W - MARGIN || barrel.y <= MARGIN || barrel.y >= H - MARGIN) {
      this.explodeBarrel(barrel, owner, false);
      if (owner === 'player') this.playerBarrel = null;
      else this.npcBarrel = null;
      return;
    }

    // Drop puddle every 80px
    if (barrel.distTraveled - barrel.lastPuddleDist >= 80) {
      barrel.lastPuddleDist = barrel.distTraveled;
      this.spawnOilPuddle(barrel.x, barrel.y, owner);
    }

    barrel.gfx.setPosition(barrel.x, barrel.y);

    // Explode on enemy contact
    const enemy = owner === 'player' ? this.arena.npc : this.arena.player;
    if (enemy.hp > 0 && Phaser.Math.Distance.Between(barrel.x, barrel.y, enemy.x, enemy.y) < 30) {
      this.explodeBarrel(barrel, owner, false);
      if (owner === 'player') this.playerBarrel = null;
      else this.npcBarrel = null;
      return;
    }

    // Explode when hit by an enemy projectile
    for (const go of this.arena.projectiles.getChildren()) {
      const proj = go as Projectile;
      if (!proj.active) continue;
      const isEnemyProj = owner === 'player' ? !proj.isFromPlayer : proj.isFromPlayer;
      if (!isEnemyProj) continue;
      if (Phaser.Math.Distance.Between(proj.x, proj.y, barrel.x, barrel.y) < 30) {
        proj.setActive(false).setVisible(false);
        (proj.body as Phaser.Physics.Arcade.Body).stop();
        this.explodeBarrel(barrel, owner, false);
        if (owner === 'player') this.playerBarrel = null;
        else this.npcBarrel = null;
        return;
      }
    }

    void time;
  }

  private explodeBarrel(barrel: OilBarrel, owner: 'player' | 'npc', clickExplode: boolean): void {
    barrel.active = false;
    barrel.gfx.destroy();
    const x = barrel.x, y = barrel.y;
    const scene = this.arena.scene;

    // Explosion visual
    const boom = scene.add.circle(x, y, 8, 0x7a3b10, 0.9).setDepth(8);
    scene.tweens.add({ targets: boom, scaleX: 10, scaleY: 10, alpha: 0, duration: 450, onComplete: () => boom.destroy() });

    // Damage
    if (owner === 'player') this.arena.damagePlayerTargets(x, y, 50, 20, 0x7a3b10);
    else {
      const player = this.arena.player;
      if (player.hp > 0 && Phaser.Math.Distance.Between(x, y, player.x, player.y) <= 50) {
        player.takeDamage(20);
        this.arena.spawnHitFlash(player.x, player.y, 0x7a3b10);
      }
    }

    // 2 extra puddles at impact
    for (let i = 0; i < 2; i++) {
      const px = x + Phaser.Math.Between(-25, 25);
      const py = y + Phaser.Math.Between(-25, 25);
      const puddle = this.spawnOilPuddle(px, py, owner);
      // Click-explode: ignite these puddles
      if (clickExplode && puddle) {
        puddle.ignited = true;
        puddle.sprite.setFillStyle(this.getPuddleColor(true), 0.65);
      }
    }
  }

  // ── Oil puddles ───────────────────────────────────────────────────────────

  private spawnOilPuddle(x: number, y: number, owner: 'player' | 'npc'): OilPuddle {
    const ePlus = owner === 'player' && this.arena.hasUpgrade('e');
    const color = this.getPuddleColor(false);
    const sprite = this.arena.scene.add.circle(x, y, 30, color, 0.55).setDepth(2);
    const puddle: OilPuddle = {
      sprite, x, y,
      expiresAt: this.arena.scene.time.now + 12000,
      ignited: false, igniteTickAccum: 0, radius: 30, oilyTickAccum: 0, owner,
    };
    if (owner === 'player') this.playerOilPuddles.push(puddle);
    else this.npcOilPuddles.push(puddle);
    return puddle;
  }

  private getPuddleColor(ignited: boolean): number {
    const ePlus = this.arena.hasUpgrade('e');
    if (ignited) return 0xff4400;
    return ePlus ? 0x336600 : 0x332200;
  }

  private updateOilPuddles(puddles: OilPuddle[], time: number, delta: number, owner: 'player' | 'npc'): void {
    const ePlus = owner === 'player' && this.arena.hasUpgrade('e');
    const enemy = owner === 'player' ? this.arena.npc : this.arena.player;

    for (let pi = puddles.length - 1; pi >= 0; pi--) {
      const p = puddles[pi];
      if (time >= p.expiresAt) {
        p.sprite.destroy();
        puddles.splice(pi, 1);
        continue;
      }

      // Update puddle color
      p.sprite.setFillStyle(this.getPuddleColor(p.ignited), p.ignited ? 0.65 : 0.55);

      // Ignited: instant fire DOT when enemy steps in, plus slow tick damage
      if (p.ignited) {
        const inPuddle = enemy.hp > 0 && Phaser.Math.Distance.Between(enemy.x, enemy.y, p.x, p.y) <= p.radius;
        if (inPuddle && enemy.oilyBurnUntil <= time) {
          enemy.oilyBurnUntil = time + 5000;
          enemy.oilyBurnAccum = 0;
          this.arena.showFloatingText(enemy.x, enemy.y - 30, 'Burning!', '#ff4400');
        }
        p.igniteTickAccum += delta;
        if (p.igniteTickAccum >= 300) {
          p.igniteTickAccum -= 300;
          if (inPuddle) {
            enemy.takeDamage(2);
            this.arena.spawnHitFlash(enemy.x, enemy.y, 0xff4400);
          }
        }
      }

      // E+ Oily: apply to enemy on puddle
      if (ePlus && enemy.hp > 0 && Phaser.Math.Distance.Between(enemy.x, enemy.y, p.x, p.y) <= p.radius) {
        enemy.oilyUntil = time + 8000;
      }
    }
  }

  // ── Oily burn ─────────────────────────────────────────────────────────────

  private updateOilyBurn(time: number, delta: number, owner: 'player' | 'npc'): void {
    const target = owner === 'player' ? this.arena.player : this.arena.npc;
    if (target.oilyBurnUntil > time) {
      if (owner === 'player') {
        this.playerOilyBurnAccum += delta;
        if (this.playerOilyBurnAccum >= 500) {
          this.playerOilyBurnAccum -= 500;
          target.takeDamage(3);
          this.arena.spawnHitFlash(target.x, target.y, 0xff6600);
        }
      } else {
        this.npcOilyBurnAccum += delta;
        if (this.npcOilyBurnAccum >= 500) {
          this.npcOilyBurnAccum -= 500;
          target.takeDamage(3);
          this.arena.spawnHitFlash(target.x, target.y, 0xff6600);
        }
      }
    } else {
      if (owner === 'player') this.playerOilyBurnAccum = 0;
      else this.npcOilyBurnAccum = 0;
    }
  }

  // ── Oily visual aura ─────────────────────────────────────────────────────

  private updateOilyVisual(owner: 'player' | 'npc', time: number): void {
    const fighter = owner === 'player' ? this.arena.player : this.arena.npc;
    const isOily = fighter.oilyUntil > time;
    if (isOily) {
      if (owner === 'player') {
        if (!this.playerOilyAura) {
          this.playerOilyAura = this.arena.scene.add.circle(fighter.x, fighter.y, 28, 0x336600, 0.4).setDepth(7);
        } else {
          this.playerOilyAura.setPosition(fighter.x, fighter.y);
        }
      } else {
        if (!this.npcOilyAura) {
          this.npcOilyAura = this.arena.scene.add.circle(fighter.x, fighter.y, 28, 0x336600, 0.4).setDepth(7);
        } else {
          this.npcOilyAura.setPosition(fighter.x, fighter.y);
        }
      }
    } else {
      if (owner === 'player' && this.playerOilyAura) {
        this.playerOilyAura.destroy();
        this.playerOilyAura = null;
      } else if (owner === 'npc' && this.npcOilyAura) {
        this.npcOilyAura.destroy();
        this.npcOilyAura = null;
      }
    }
  }

  // ── Shield Generator (F revamp) ───────────────────────────────────────────

  doPlaceShieldGen(tx: number, ty: number, owner: 'player' | 'npc'): void {
    if (owner !== 'player') return; // NPC keeps old firewall
    if (this.playerShieldGen) {
      this.playerShieldGen.gfx.destroy();
      this.playerShieldGen.laserGfx.destroy();
    }
    const gfx = this.arena.scene.add.graphics().setDepth(8);
    const laserGfx = this.arena.scene.add.graphics().setDepth(9);
    const gen: ShieldGenerator = {
      gfx, laserGfx, x: tx, y: ty,
      charged: true,
      chargedUntil: this.arena.scene.time.now + 5000,
      owner,
    };
    this.playerShieldGen = gen;
    this.drawShieldGenGfx(gen);
    this.arena.showFloatingText(tx, ty - 24, 'Shield Gen', '#44aacc');
  }

  private drawShieldGenGfx(gen: ShieldGenerator): void {
    gen.gfx.clear();
    const color = gen.charged ? 0x44aacc : 0x446666;
    const alpha = gen.charged ? 0.9 : 0.5;
    gen.gfx.lineStyle(3, color, alpha);
    const sides = 6;
    const r = 18;
    for (let i = 0; i < sides; i++) {
      const a0 = (i / sides) * Math.PI * 2 - Math.PI / 6;
      const a1 = ((i + 1) / sides) * Math.PI * 2 - Math.PI / 6;
      gen.gfx.lineBetween(
        gen.x + Math.cos(a0) * r, gen.y + Math.sin(a0) * r,
        gen.x + Math.cos(a1) * r, gen.y + Math.sin(a1) * r,
      );
    }
    gen.gfx.fillStyle(color, 0.2);
    gen.gfx.fillCircle(gen.x, gen.y, 14);
  }

  private updateShieldGen(time: number): void {
    const gen = this.playerShieldGen;
    if (!gen) return;

    // Discharge after 5s
    if (gen.charged && time > gen.chargedUntil) {
      gen.charged = false;
      this.drawShieldGenGfx(gen);
      this.arena.showFloatingText(gen.x, gen.y - 20, 'Needs Recharge', '#888888');
    }

    gen.laserGfx.clear();
    if (!gen.charged) return;

    // Scan enemy projectiles within 150px
    for (const go of this.arena.projectiles.getChildren()) {
      const proj = go as Projectile;
      if (!proj.active || proj.isFromPlayer) continue;
      const dist = Phaser.Math.Distance.Between(proj.x, proj.y, gen.x, gen.y);
      if (dist <= 150) {
        // Destroy projectile
        proj.setActive(false).setVisible(false);
        (proj.body as Phaser.Physics.Arcade.Body).stop();
        // Laser flash
        gen.laserGfx.lineStyle(3, 0x44aacc, 0.9);
        gen.laserGfx.lineBetween(gen.x, gen.y, proj.x, proj.y);
        // AoE at destruction point
        this.arena.damagePlayerTargets(proj.x, proj.y, 30, 8, 0x44aacc);
        const boom = this.arena.scene.add.circle(proj.x, proj.y, 5, 0x44aacc, 0.8).setDepth(9);
        this.arena.scene.tweens.add({ targets: boom, scaleX: 5, scaleY: 5, alpha: 0, duration: 300, onComplete: () => boom.destroy() });
      }
    }
    // Fade laser
    this.arena.scene.tweens.add({ targets: gen.laserGfx, alpha: 0, duration: 80,
      onComplete: () => { gen.laserGfx.setAlpha(1); gen.laserGfx.clear(); } });
  }

  // ── Old firewall (NPC) ────────────────────────────────────────────────────

  doPlaceFirewallNpc(tx: number, ty: number): void {
    if (this.npcFirewall) this.npcFirewall.sprite.destroy();
    const npc = this.arena.npc;
    const angle = Math.atan2(npc.y - ty, npc.x - tx) - Math.PI / 2;
    const sprite = this.arena.scene.add.rectangle(tx, ty, 120, 60, 0xff6600, 0.45)
      .setStrokeStyle(2, 0xff8800).setDepth(3).setRotation(angle);
    this.npcFirewall = { sprite, x: tx, y: ty, angle, hp: 100, owner: 'npc' };
  }

  private updateNpcFirewall(): void {
    if (!this.npcFirewall || this.npcFirewall.hp <= 0) return;
    const fw = this.npcFirewall;
    const fwCos = Math.cos(-fw.angle);
    const fwSin = Math.sin(-fw.angle);
    for (const go of this.arena.projectiles.getChildren()) {
      const proj = go as Projectile;
      if (!proj.active || !proj.isFromPlayer) continue;
      const relX = proj.x - fw.x;
      const relY = proj.y - fw.y;
      const localX = fwCos * relX - fwSin * relY;
      const localY = fwSin * relX + fwCos * relY;
      if (Math.abs(localX) <= 60 && Math.abs(localY) <= 30) {
        fw.hp -= (proj as Projectile).damage ?? 5;
        proj.setActive(false).setVisible(false);
        (proj.body as Phaser.Physics.Arcade.Body).stop();
        if (fw.hp <= 0) { fw.sprite.destroy(); this.npcFirewall = null; break; }
      }
    }
  }

  // ── Overdrive (player legacy Q, NPC still uses this) ─────────────────────

  doStartOverdrive(tx: number, ty: number, owner: 'player' | 'npc'): void {
    const drones = owner === 'player' ? this.playerDrones : this.npcDrones;
    if (drones.length === 0) return;
    const caster = owner === 'player' ? this.arena.player : this.arena.npc;
    const angle = Math.atan2(ty - caster.y, tx - caster.x);
    const duration = 500 * drones.length;
    if (owner === 'player') {
      this.playerOverdriveDroneCount = drones.length;
      this.playerOverdriveActive = true;
      this.playerOverdriveEnd = this.arena.scene.time.now + duration;
      this.playerOverdriveAngle = angle;
      this.playerOverdriveTickAccum = 0;
      this.arena.nukeChanneling = true;
      this.arena.nukeChannelEnd = this.playerOverdriveEnd;
      if (!this.playerOverdriveGfx) this.playerOverdriveGfx = this.arena.scene.add.graphics().setDepth(7);
    } else {
      this.npcOverdriveActive = true;
      this.npcOverdriveEnd = this.arena.scene.time.now + duration;
      this.npcOverdriveAngle = angle;
      this.npcOverdriveTickAccum = 0;
      this.arena.npcNukeChanneling = true;
      this.arena.npcNukeChannelEnd = this.npcOverdriveEnd;
      if (!this.npcOverdriveGfx) this.npcOverdriveGfx = this.arena.scene.add.graphics().setDepth(7);
    }
  }

  private updatePlayerOverdrive(time: number, delta: number, mouseX: number, mouseY: number): void {
    if (!this.playerOverdriveActive) return;
    const player = this.arena.player;
    if (time >= this.playerOverdriveEnd) {
      this.playerOverdriveActive = false;
      this.arena.nukeChanneling = false;
      if (this.arena.hasUpgrade('r')) {
        for (const d of this.playerDrones) this.spawnOilPuddle(d.sprite.x, d.sprite.y, 'player');
      }
      if (this.arena.hasUpgrade('q')) {
        for (let i = 0; i < this.playerOverdriveDroneCount; i++) {
          const mx = mouseX, my = mouseY;
          this.arena.scene.time.delayedCall(i * 500, () => this.fireSalvoBomb(mx, my));
        }
      }
      for (const d of this.playerDrones) d.sprite.destroy();
      this.playerDrones = [];
      if (this.playerOverdriveGfx) { this.playerOverdriveGfx.destroy(); this.playerOverdriveGfx = null; }
    } else {
      const tgtAng = Math.atan2(mouseY - player.y, mouseX - player.x);
      const diff = Phaser.Math.Angle.Wrap(tgtAng - this.playerOverdriveAngle);
      const rotSpeed = (18 * Math.PI / 180) * delta / 1000;
      this.playerOverdriveAngle += Math.sign(diff) * Math.min(Math.abs(diff), rotSpeed);
      const endX = player.x + Math.cos(this.playerOverdriveAngle) * 1000;
      const endY = player.y + Math.sin(this.playerOverdriveAngle) * 1000;
      if (this.playerOverdriveGfx) {
        this.playerOverdriveGfx.clear();
        this.playerOverdriveGfx.lineStyle(22, 0xff6600, 0.6);
        this.playerOverdriveGfx.lineBetween(player.x, player.y, endX, endY);
      }
      this.playerOverdriveTickAccum += delta;
      if (this.playerOverdriveTickAccum >= 100) {
        this.playerOverdriveTickAccum -= 100;
        this.arena.damagePlayerTargets(
          player.x, player.y, 0, 0, 0xff6600, // sentinel call
        );
        // Direct beam damage
        const npc = this.arena.npc;
        if (npc.hp > 0) {
          const d = this.arena.pointToSegmentDist(npc.x, npc.y, player.x, player.y, endX, endY);
          if (d <= 30) {
            npc.takeDamage(15);
            this.arena.spawnHitFlash(npc.x, npc.y, 0xff6600);
          }
        }
      }
    }
  }

  private updateNpcOverdrive(time: number, delta: number): void {
    if (!this.npcOverdriveActive) return;
    const npc = this.arena.npc;
    if (time >= this.npcOverdriveEnd) {
      this.npcOverdriveActive = false;
      this.arena.npcNukeChanneling = false;
      for (const d of this.npcDrones) d.sprite.destroy();
      this.npcDrones = [];
      if (this.npcOverdriveGfx) { this.npcOverdriveGfx.destroy(); this.npcOverdriveGfx = null; }
    } else {
      const aimX = this.arena.p2LastAimX, aimY = this.arena.p2LastAimY;
      const tgtAng = Math.atan2(aimY - npc.y, aimX - npc.x);
      const diff = Phaser.Math.Angle.Wrap(tgtAng - this.npcOverdriveAngle);
      const rotSpeed = (18 * Math.PI / 180) * delta / 1000;
      this.npcOverdriveAngle += Math.sign(diff) * Math.min(Math.abs(diff), rotSpeed);
      const endX = npc.x + Math.cos(this.npcOverdriveAngle) * 1000;
      const endY = npc.y + Math.sin(this.npcOverdriveAngle) * 1000;
      if (this.npcOverdriveGfx) {
        this.npcOverdriveGfx.clear();
        this.npcOverdriveGfx.lineStyle(22, 0xff6600, 0.6);
        this.npcOverdriveGfx.lineBetween(npc.x, npc.y, endX, endY);
      }
      this.npcOverdriveTickAccum += delta;
      if (this.npcOverdriveTickAccum >= 100) {
        this.npcOverdriveTickAccum -= 100;
        const player = this.arena.player;
        const d = this.arena.pointToSegmentDist(player.x, player.y, npc.x, npc.y, endX, endY);
        if (d <= 30) {
          player.takeDamage(15);
          this.arena.spawnHitFlash(player.x, player.y, 0xff6600);
        }
      }
    }
  }

  private fireSalvoBomb(tx: number, ty: number): void {
    const player = this.arena.player;
    const scene = this.arena.scene;
    const bomb = scene.add.circle(player.x, player.y, 7, 0xffaa00, 0.9).setDepth(8);
    scene.tweens.add({
      targets: bomb, x: tx, y: ty, duration: 450, ease: 'Power2',
      onComplete: () => {
        const boom = scene.add.circle(tx, ty, 7, 0xff6600, 0.9).setDepth(8);
        scene.tweens.add({ targets: boom, scaleX: 6, scaleY: 6, alpha: 0, duration: 350, onComplete: () => boom.destroy() });
        bomb.destroy();
        this.arena.damagePlayerTargets(tx, ty, 50, 10, 0xff6600);
      },
    });
  }

  // ── Train Morph (Q revamp) ────────────────────────────────────────────────

  doStartTrainMorph(owner: 'player' | 'npc'): void {
    if (owner !== 'player') return; // NPC doesn't train morph
    const droneCount = this.playerDrones.length;
    const duration = Math.max(1500, 1500 * Math.max(1, droneCount));
    const time = this.arena.scene.time.now;
    this.playerTrainActive = true;
    this.playerTrainEndsAt = time + duration;
    this.playerTrainDirX = 1;
    this.playerTrainDirY = 0;
    this.playerTrainSegments = [];
    this.playerTrainPosHistory = [];
    this.playerTrainPuddleAccum = 0;
    this.playerTrainHitAccum = 0;
    this.playerTrainCollectedCoal = 0;
    this.trainSpeedBonus = 1;
    this.trainDamageMult = 1;
    this.trainQPlusActive = false;
    this.playerTrainGfx = this.arena.scene.add.graphics().setDepth(9);

    // Scatter coal pickups
    this.clearCoal();
    const W = this.arena.getSceneWidth();
    const H = this.arena.getSceneHeight();
    for (let i = 0; i < 5; i++) {
      const cx = Phaser.Math.Between(80, W - 80);
      const cy = Phaser.Math.Between(80, H - 80);
      const gfx = this.arena.scene.add.circle(cx, cy, 8, 0x111111, 0.9)
        .setStrokeStyle(2, 0xffa500, 0.8).setDepth(9);
      this.coalPickups.push({ gfx, x: cx, y: cy, collected: false });
    }

    this.arena.showFloatingText(this.arena.player.x, this.arena.player.y - 40, 'Train Morph!', '#ff8800');
  }

  private updateTrain(time: number, delta: number): void {
    if (!this.playerTrainActive) return;

    if (time > this.playerTrainEndsAt) {
      this.endTrainMorph();
      return;
    }

    const player = this.arena.player;
    const W = this.arena.getSceneWidth();
    const H = this.arena.getSceneHeight();
    const speed = 200 * this.trainSpeedBonus;

    // Apply direction-based movement (override WASD)
    const body = player.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(this.playerTrainDirX * speed, this.playerTrainDirY * speed);

    // Record position history (every frame)
    this.playerTrainPosHistory.unshift({ x: player.x, y: player.y });
    const maxHistory = 300; // cap buffer
    if (this.playerTrainPosHistory.length > maxHistory) this.playerTrainPosHistory.length = maxHistory;

    // Update segment positions (each segment trails by ~30px of history)
    const SEGMENT_SPACING = 12; // history frames between segments
    while (this.playerTrainSegments.length < Math.floor(this.playerTrainPosHistory.length / SEGMENT_SPACING)) {
      this.playerTrainSegments.push({ x: player.x, y: player.y, lastHitAt: 0 });
    }
    for (let i = 0; i < this.playerTrainSegments.length; i++) {
      const histIdx = Math.min((i + 1) * SEGMENT_SPACING, this.playerTrainPosHistory.length - 1);
      this.playerTrainSegments[i].x = this.playerTrainPosHistory[histIdx].x;
      this.playerTrainSegments[i].y = this.playerTrainPosHistory[histIdx].y;
    }

    // Draw train
    if (this.playerTrainGfx) {
      this.playerTrainGfx.clear();
      const segColor = this.trainQPlusActive ? 0xff6600 : 0x996633;
      this.playerTrainGfx.fillStyle(segColor, 0.8);
      for (const seg of this.playerTrainSegments) {
        this.playerTrainGfx.fillCircle(seg.x, seg.y, 12);
      }
    }

    // Drop oil puddle every 2s (Q+ halves interval)
    this.playerTrainPuddleAccum += delta;
    const puddleInterval = this.trainQPlusActive ? 1000 : 2000;
    if (this.playerTrainPuddleAccum >= puddleInterval) {
      this.playerTrainPuddleAccum -= puddleInterval;
      const puddle = this.spawnOilPuddle(player.x, player.y, 'player');
      if (this.trainQPlusActive && puddle) {
        puddle.ignited = true;
        puddle.sprite.setFillStyle(0xff4400, 0.65);
      }
    }

    // Contact damage on NPC
    const npc = this.arena.npc;
    if (npc.hp > 0) {
      // Head: shared 500ms cooldown
      this.playerTrainHitAccum += delta;
      if (this.playerTrainHitAccum >= 500) {
        this.playerTrainHitAccum = 0;
        const headDist = Phaser.Math.Distance.Between(player.x, player.y, npc.x, npc.y);
        if (headDist <= 28) {
          npc.takeDamage(Math.round(8 * this.trainDamageMult));
          this.arena.spawnHitFlash(npc.x, npc.y, 0xff8800);
          this.arena.showFloatingText(npc.x, npc.y - 30, `${Math.round(8 * this.trainDamageMult)}`, '#ff8800');
        }
      }
      // Each segment has its own 500ms cooldown
      for (const seg of this.playerTrainSegments) {
        if (time - seg.lastHitAt >= 500 && Phaser.Math.Distance.Between(seg.x, seg.y, npc.x, npc.y) <= 20) {
          seg.lastHitAt = time;
          npc.takeDamage(Math.round(3 * this.trainDamageMult));
          this.arena.spawnHitFlash(npc.x, npc.y, 0xff8800);
        }
      }
    }

    // Coal pickup check
    for (const coal of this.coalPickups) {
      if (coal.collected) continue;
      if (Phaser.Math.Distance.Between(player.x, player.y, coal.x, coal.y) <= 20) {
        coal.collected = true;
        coal.gfx.destroy();
        this.playerTrainCollectedCoal++;
        this.trainSpeedBonus = Math.min(2.0, this.trainSpeedBonus + 0.05);
        this.trainDamageMult = Math.min(3.0, this.trainDamageMult + 0.1);
        this.arena.showFloatingText(coal.x, coal.y - 20, '🔥 Coal!', '#ffa500');

        // Q+ upgrade: all 5 collected
        if (this.playerTrainCollectedCoal >= 5 && this.arena.hasUpgrade('q') && !this.trainQPlusActive) {
          this.trainQPlusActive = true;
          this.playerTrainEndsAt += 5000;
          this.trainDamageMult *= 2;
          this.arena.showFloatingText(player.x, player.y - 50, 'Train Overload!', '#ff4400');
        }
      }
    }

    void W; void H;
  }

  applyTrainMovement(body: Phaser.Physics.Arcade.Body): void {
    if (!this.playerTrainActive) return;
    const speed = 200 * this.trainSpeedBonus;
    body.setVelocity(this.playerTrainDirX * speed, this.playerTrainDirY * speed);
  }

  private endTrainMorph(): void {
    this.playerTrainActive = false;
    if (this.playerTrainGfx) { this.playerTrainGfx.destroy(); this.playerTrainGfx = null; }
    this.clearCoal();
    this.playerTrainSegments = [];
    this.playerTrainPosHistory = [];
    for (const d of this.playerDrones) d.sprite.destroy();
    this.playerDrones = [];
    const player = this.arena.player;
    player.startCooldown('train-morph');
    this.arena.showFloatingText(player.x, player.y - 40, 'Train Over', '#ff8800');
  }

  private clearTrain(): void {
    if (this.playerTrainGfx) { this.playerTrainGfx.destroy(); this.playerTrainGfx = null; }
    this.clearCoal();
    this.playerTrainActive = false;
    this.playerTrainSegments = [];
    this.playerTrainPosHistory = [];
  }

  private clearCoal(): void {
    for (const c of this.coalPickups) c.gfx.destroy();
    this.coalPickups = [];
    this.playerTrainCollectedCoal = 0;
  }

  // ── NPC dispatchers (called from buildNpcContext) ─────────────────────────

  doNpcSpawnDrone(): void { this.doSpawnDrone('npc'); }

  doNpcCommandDrones(tx: number, ty: number): void { this.doCommandDrones(tx, ty, 'npc'); }

  doNpcLaunchDrone(tx: number, ty: number): void { this.doLaunchDrone(tx, ty, 'npc'); }
}
