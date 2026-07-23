import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';
import { CastContext } from '../Ability';

// ── PlasmaArenaApi ────────────────────────────────────────────────────────

export interface PlasmaArenaApi {
  readonly player: Fighter;
  readonly npc: Fighter;
  readonly enemies: Fighter[];
  readonly scene: Phaser.Scene;
  readonly eKey: Phaser.Input.Keyboard.Key;
  readonly rKey: Phaser.Input.Keyboard.Key;
  readonly fKey: Phaser.Input.Keyboard.Key;
  readonly qKey: Phaser.Input.Keyboard.Key;
  readonly nukeChanneling: boolean;
  readonly pointerWasDown: boolean;
  readonly width: number;
  readonly height: number;
  hasUpgrade(slot: string): boolean;
  hasPerk(owner: 'player' | 'npc', perkId: string): boolean;
  spawnHitFlash(x: number, y: number, color: number): void;
  spawnDamageNumber(x: number, y: number, amount: number): void;
  showFloatingText(x: number, y: number, text: string, color: string): void;
  /** Read the current playerSpeedMult */
  getPlayerSpeedMult(): number;
  /** Set playerSpeedMult (used by incarnate) */
  setPlayerSpeedMult(v: number): void;
  /** Set npcSpeedMult (used by NPC incarnate) */
  setNpcSpeedMult(v: number): void;
  buildPlayerContext(mx: number, my: number): CastContext;
  dealAoeDamage(cx: number, cy: number, radius: number, damage: number, owner: 'player' | 'npc'): void;
}

// ── Internal interfaces ───────────────────────────────────────────────────

interface PlasmaArenaZone {
  sprite: Phaser.GameObjects.Arc;
  x: number;
  y: number;
  radius: number;
  owner: 'player' | 'npc';
  playerInAccum: number;
  npcInAccum: number;
  expiresAt: number;
}

interface PlasmaCurrentOrb {
  spriteA: Phaser.GameObjects.Arc;
  spriteB: Phaser.GameObjects.Arc;
  chainGraphic: Phaser.GameObjects.Graphics;
  ax: number; ay: number;
  bx: number; by: number;
  vax: number; vay: number;
  vbx: number; vby: number;
  owner: 'player' | 'npc';
  tickAccum: number;
  active: boolean;
  expiresAt: number;
  stopped: boolean;
}

interface PlasmaBlade {
  sprite: Phaser.GameObjects.Arc;
  x: number;
  y: number;
  vx: number;
  vy: number;
  owner: 'player' | 'npc';
  expiresAt: number;
  spawnedAt: number;
  active: boolean;
}

interface PlasmaChaosEffect {
  target: 'player' | 'npc';
  expiresAt: number;
  tickAccum: number;
  aura: Phaser.GameObjects.Arc | null;
}

interface PlasmaChaosOrb {
  sprite: Phaser.GameObjects.Arc;
  x: number;
  y: number;
  vx: number;
  vy: number;
  owner: 'player' | 'npc';
  active: boolean;
}

interface PlasmaVoltPoint {
  sprite: Phaser.GameObjects.Arc;
  x: number;
  y: number;
  owner: 'player' | 'npc';
  charges: number;
  expiresAt: number;
  paired?: { x: number; y: number };
  pairedRef?: PlasmaVoltPoint;
}

/** A pending Plasma Burst AoE that detonates at (x, y) once `fireAt` is reached. */
interface PlasmaClickBlast {
  x: number;
  y: number;
  owner: 'player' | 'npc';
  fireAt: number;
}

// ── PlasmaKit ─────────────────────────────────────────────────────────────

export class PlasmaKit {
  // ── Shared world objects ──────────────────────────────────────────
  private plasmaArenas: PlasmaArenaZone[] = [];
  private plasmaCurrentOrbs: PlasmaCurrentOrb[] = [];
  private plasmaBlades: PlasmaBlade[] = [];
  private plasmaChaosEffects: PlasmaChaosEffect[] = [];
  private plasmaChaosOrbs: PlasmaChaosOrb[] = [];
  private plasmaVoltPoints: PlasmaVoltPoint[] = [];
  private plasmaClickBlasts: PlasmaClickBlast[] = [];

  // ── Player incarnate state ────────────────────────────────────────
  private plasmaIncarnateActive = false;
  private plasmaIncarnateEnd = 0;
  private plasmaIncarnateLastChain = 0;
  private plasmaIncarnateLastTouch = 0;
  private plasmaIncarnateAura: Phaser.GameObjects.Arc | null = null;

  // ── Player R-hold state ───────────────────────────────────────────
  private plasmaRHolding = false;
  private plasmaRHeldSince = 0;
  private plasmaRPreviewA: Phaser.GameObjects.Arc | null = null;
  private plasmaRPreviewB: Phaser.GameObjects.Arc | null = null;

  // ── Solar perk state ──────────────────────────────────────────────
  private solarPuddleAccum = 0;
  private solarPuddles: { sprite: Phaser.GameObjects.Arc; expiresAt: number; tickAccum: number; owner: 'player' | 'npc' }[] = [];

  // ── NPC incarnate state ───────────────────────────────────────────
  private npcPlasmaIncarnateActive = false;
  private npcPlasmaIncarnateEnd = 0;
  private npcPlasmaIncarnateLastChain = 0;
  private npcPlasmaIncarnateLastTouch = 0;
  private npcPlasmaIncarnateAura: Phaser.GameObjects.Arc | null = null;

  constructor(private arena: PlasmaArenaApi) {}

  // ── reset ─────────────────────────────────────────────────────────

  reset(): void {
    for (const a of this.plasmaArenas) a.sprite.destroy();
    this.plasmaArenas = [];

    for (const o of this.plasmaCurrentOrbs) {
      o.spriteA.destroy();
      o.spriteB.destroy();
      o.chainGraphic.destroy();
    }
    this.plasmaCurrentOrbs = [];

    for (const b of this.plasmaBlades) b.sprite.destroy();
    this.plasmaBlades = [];

    for (const e of this.plasmaChaosEffects) { if (e.aura) e.aura.destroy(); }
    this.plasmaChaosEffects = [];

    for (const o of this.plasmaChaosOrbs) o.sprite.destroy();
    this.plasmaChaosOrbs = [];

    for (const vp of this.plasmaVoltPoints) vp.sprite.destroy();
    this.plasmaVoltPoints = [];

    this.plasmaClickBlasts = [];

    this.plasmaIncarnateActive = false;
    this.plasmaIncarnateEnd = 0;
    this.plasmaIncarnateLastChain = 0;
    this.plasmaIncarnateLastTouch = 0;
    if (this.plasmaIncarnateAura) { this.plasmaIncarnateAura.destroy(); this.plasmaIncarnateAura = null; }

    this.plasmaRHolding = false;
    this.plasmaRHeldSince = 0;
    if (this.plasmaRPreviewA) { this.plasmaRPreviewA.destroy(); this.plasmaRPreviewA = null; }
    if (this.plasmaRPreviewB) { this.plasmaRPreviewB.destroy(); this.plasmaRPreviewB = null; }

    for (const p of this.solarPuddles) p.sprite.destroy();
    this.solarPuddles = [];
    this.solarPuddleAccum = 0;

    this.npcPlasmaIncarnateActive = false;
    this.npcPlasmaIncarnateEnd = 0;
    this.npcPlasmaIncarnateLastChain = 0;
    this.npcPlasmaIncarnateLastTouch = 0;
    if (this.npcPlasmaIncarnateAura) { this.npcPlasmaIncarnateAura.destroy(); this.npcPlasmaIncarnateAura = null; }
  }

  // ── handleInput ───────────────────────────────────────────────────

  handleInput(
    time: number,
    _delta: number,
    pointer: Phaser.Input.Pointer,
    mouseX: number,
    mouseY: number,
  ): void {
    const { player, nukeChanneling, pointerWasDown, rKey, eKey, fKey, qKey } = this.arena;

    if (nukeChanneling) return;
    if (this.plasmaIncarnateActive) return;

    const playerCtx = this.arena.buildPlayerContext(mouseX, mouseY);

    // Click: Plasma Burst
    if (pointer.isDown && !pointerWasDown) {
      player.castAbility('plasma-burst', playerCtx);
    }

    // E: Unstable Arena at cursor
    if (Phaser.Input.Keyboard.JustDown(eKey)) {
      player.castAbility('plasma-arena', playerCtx);
    }

    // R: Plasma Current — hold to widen gap, release to fire
    // Solar perk: if R just pressed and there's an active unstopped player current, stop it instead
    if (Phaser.Input.Keyboard.JustDown(rKey) && this.arena.hasPerk('player', 'solar')) {
      const activeCurrents = this.plasmaCurrentOrbs.filter(o => o.owner === 'player' && o.active && !o.stopped);
      if (activeCurrents.length > 0) {
        const now = this.arena.scene.time.now;
        for (const orb of activeCurrents) {
          orb.vax = 0; orb.vay = 0;
          orb.vbx = 0; orb.vby = 0;
          orb.stopped = true;
          orb.expiresAt = now + 20000;
        }
        this.arena.showFloatingText(player.x, player.y - 40, '⏸ STOPPED', '#cc44ff');
        return; // Don't start a new current
      }
    }
    if (rKey.isDown && !this.plasmaRHolding) {
      if (player.getCooldownRatio('plasma-current') >= 1) {
        this.plasmaRHolding = true;
        this.plasmaRHeldSince = time;
      }
    }
    if (this.plasmaRHolding) {
      const totalHeld = time - this.plasmaRHeldSince;
      const heldMs = Math.min(totalHeld, 1500);
      const voltMode = this.arena.hasUpgrade('r') && totalHeld >= 2500;
      const spread = voltMode ? 96 : 40 + (heldMs / 1500) * 80;
      const dx = mouseX - player.x;
      const dy = mouseY - player.y;
      const ang = Math.atan2(dy, dx);
      const perpX = -Math.sin(ang);
      const perpY = Math.cos(ang);
      const ax = player.x + perpX * spread;
      const ay = player.y + perpY * spread;
      const bx = player.x - perpX * spread;
      const by = player.y - perpY * spread;
      const scene = this.arena.scene;
      if (!this.plasmaRPreviewA) {
        this.plasmaRPreviewA = scene.add.circle(ax, ay, 8, 0xcc44ff, 0.5).setDepth(5);
        this.plasmaRPreviewB = scene.add.circle(bx, by, 8, 0xcc44ff, 0.5).setDepth(5);
      } else {
        this.plasmaRPreviewA.setPosition(ax, ay);
        this.plasmaRPreviewB!.setPosition(bx, by);
      }
    }
    if (!rKey.isDown && this.plasmaRHolding) {
      this.plasmaRHolding = false;
      if (this.plasmaRPreviewA) { this.plasmaRPreviewA.destroy(); this.plasmaRPreviewA = null; }
      if (this.plasmaRPreviewB) { this.plasmaRPreviewB.destroy(); this.plasmaRPreviewB = null; }
      const totalHeldMs = time - this.plasmaRHeldSince;
      if (this.arena.hasUpgrade('r') && totalHeldMs >= 2500) {
        this.doPlasmaSpawnVoltPoints(mouseX, mouseY, 'player');
      } else {
        const heldMs = Math.min(totalHeldMs, 1500);
        const spread = 40 + (heldMs / 1500) * 80;
        this.doPlasmaCurrentLaunchWithSpread(mouseX, mouseY, spread, 'player');
      }
      player.triggerCooldown('plasma-current');
    }

    // F: Chaos Blades
    if (Phaser.Input.Keyboard.JustDown(fKey)) {
      player.castAbility('plasma-chaos-blades', playerCtx);
    }

    // Q: Chaos Incarnate
    if (Phaser.Input.Keyboard.JustDown(qKey)) {
      player.castAbility('plasma-chaos-incarnate', playerCtx);
    }
  }

  // ── update ────────────────────────────────────────────────────────

  update(time: number, delta: number): void {
    const { scene } = this.arena;
    const W = this.arena.width;
    const H = this.arena.height;
    const pad = 32;
    const leftBound = pad;
    const rightBound = W - pad;
    const topBound = pad;
    const bottomBound = H - pad;

    // ── Unstable Arenas ───────────────────────────────────────────
    for (let i = this.plasmaArenas.length - 1; i >= 0; i--) {
      const arena = this.plasmaArenas[i];
      if (time > arena.expiresAt) {
        arena.sprite.destroy();
        this.plasmaArenas.splice(i, 1);
        continue;
      }

      const player = this.arena.player;
      const npc = this.arena.npc;
      const playerIn = Phaser.Math.Distance.Between(arena.x, arena.y, player.x, player.y) <= arena.radius;
      const npcIn = Phaser.Math.Distance.Between(arena.x, arena.y, npc.x, npc.y) <= arena.radius;

      if (playerIn) {
        arena.playerInAccum += delta;
        if (arena.playerInAccum >= 3000) {
          this.doPlasmaArenaExplode(arena);
          this.plasmaArenas.splice(i, 1);
          continue;
        }
      } else {
        arena.playerInAccum = 0;
      }

      if (npcIn) {
        arena.npcInAccum += delta;
        if (arena.npcInAccum >= 3000) {
          this.doPlasmaArenaExplode(arena);
          this.plasmaArenas.splice(i, 1);
          continue;
        }
      } else {
        arena.npcInAccum = 0;
      }

      const urgencyRatio = Math.max(arena.playerInAccum, arena.npcInAccum) / 3000;
      if (urgencyRatio > 0.5) {
        arena.sprite.setStrokeStyle(3 + urgencyRatio * 3, 0xff2222, 0.9);
      }
    }

    // ── Plasma Current Orbs ───────────────────────────────────────
    for (let i = this.plasmaCurrentOrbs.length - 1; i >= 0; i--) {
      const orb = this.plasmaCurrentOrbs[i];
      if (!orb.active || time > orb.expiresAt) {
        // Solar: stopped currents explode at their endpoints on expiry
        if (orb.stopped && time > orb.expiresAt) {
          this.doSolarEndpointExplosion(orb.ax, orb.ay, orb.owner);
          this.doSolarEndpointExplosion(orb.bx, orb.by, orb.owner);
        }
        orb.spriteA.destroy();
        orb.spriteB.destroy();
        orb.chainGraphic.destroy();
        this.plasmaCurrentOrbs.splice(i, 1);
        continue;
      }

      const dt = delta / 1000;
      orb.ax += orb.vax * dt;
      orb.ay += orb.vay * dt;
      orb.bx += orb.vbx * dt;
      orb.by += orb.vby * dt;
      orb.spriteA.setPosition(orb.ax, orb.ay);
      orb.spriteB.setPosition(orb.bx, orb.by);

      if (orb.ax < 0 || orb.ax > W || orb.ay < 0 || orb.ay > H ||
          orb.bx < 0 || orb.bx > W || orb.by < 0 || orb.by > H) {
        orb.active = false;
        continue;
      }

      orb.chainGraphic.clear();
      orb.chainGraphic.lineStyle(3, 0xcc44ff, 0.8);
      orb.chainGraphic.lineBetween(orb.ax, orb.ay, orb.bx, orb.by);

      const chainTargets = orb.owner === 'player' ? this.arena.enemies : [this.arena.player];
      let chainCollapsed = false;
      for (const hitTarget of chainTargets) {
        if (!hitTarget.active || hitTarget.hp <= 0) continue;
        const dA = Phaser.Math.Distance.Between(orb.ax, orb.ay, hitTarget.x, hitTarget.y);
        const dB = Phaser.Math.Distance.Between(orb.bx, orb.by, hitTarget.x, hitTarget.y);
        if (dA <= 20 || dB <= 20) {
          hitTarget.takeDamage(10);
          this.arena.spawnHitFlash(hitTarget.x, hitTarget.y, 0xcc44ff);
          this.arena.showFloatingText(hitTarget.x, hitTarget.y - 36, '💥 Chain Collapse!', '#cc44ff');
          this.doPlasmaCurrentExplode(orb);
          chainCollapsed = true;
          break;
        }
      }
      if (chainCollapsed) continue;

      orb.tickAccum += delta;
      if (orb.tickAccum >= 100) {
        orb.tickAccum -= 100;
        for (const hitTarget of chainTargets) {
          if (!hitTarget.active || hitTarget.hp <= 0) continue;
          if (this.pointNearSegment(hitTarget.x, hitTarget.y, orb.ax, orb.ay, orb.bx, orb.by, 18)) {
            hitTarget.takeDamage(2);
          }
        }
      }
    }

    // ── Chaos Blades ──────────────────────────────────────────────
    for (let i = this.plasmaBlades.length - 1; i >= 0; i--) {
      const blade = this.plasmaBlades[i];
      if (!blade.active || time > blade.expiresAt) {
        blade.sprite.destroy();
        this.plasmaBlades.splice(i, 1);
        continue;
      }

      const dt = delta / 1000;
      blade.x += blade.vx * dt;
      blade.y += blade.vy * dt;

      if (blade.x < leftBound) { blade.x = leftBound; blade.vx = Math.abs(blade.vx); }
      if (blade.x > rightBound) { blade.x = rightBound; blade.vx = -Math.abs(blade.vx); }
      if (blade.y < topBound) { blade.y = topBound; blade.vy = Math.abs(blade.vy); }
      if (blade.y > bottomBound) { blade.y = bottomBound; blade.vy = -Math.abs(blade.vy); }

      blade.sprite.setPosition(blade.x, blade.y);

      const ownerGrace = time < blade.spawnedAt + 2000;
      const fighterChecks: Array<{ f: Fighter; side: 'player' | 'npc' }> = [
        { f: this.arena.player, side: 'player' },
        { f: this.arena.npc,    side: 'npc' },
      ];
      for (const { f, side } of fighterChecks) {
        if (ownerGrace && side === blade.owner) continue;
        const d = Phaser.Math.Distance.Between(blade.x, blade.y, f.x, f.y);
        if (d <= 20) {
          f.takeDamage(8);
          this.arena.spawnHitFlash(f.x, f.y, 0xff44ff);
          this.doPlasmaApplyChaos(side);
          if (this.arena.hasUpgrade('r')) this.doPlasmaVoltRelay(blade.x, blade.y, blade.owner);
          blade.vx += (Math.random() - 0.5) * 60;
          blade.vy += (Math.random() - 0.5) * 60;
        }
      }
    }

    // ── Chaos Effects (orb spawning) ──────────────────────────────
    for (let i = this.plasmaChaosEffects.length - 1; i >= 0; i--) {
      const effect = this.plasmaChaosEffects[i];
      if (time > effect.expiresAt) {
        if (effect.aura) { effect.aura.destroy(); effect.aura = null; }
        this.plasmaChaosEffects.splice(i, 1);
        continue;
      }
      const fighter = effect.target === 'player' ? this.arena.player : this.arena.npc;
      if (effect.aura) effect.aura.setPosition(fighter.x, fighter.y);

      effect.tickAccum += delta;
      if (effect.tickAccum >= 5000) {
        effect.tickAccum -= 5000;
        this.doPlasmaSpawnChaosOrbs(fighter.x, fighter.y, effect.target);
      }
    }

    // ── Chaos Orbs ────────────────────────────────────────────────
    for (let i = this.plasmaChaosOrbs.length - 1; i >= 0; i--) {
      const orb = this.plasmaChaosOrbs[i];
      if (!orb.active) {
        orb.sprite.destroy();
        this.plasmaChaosOrbs.splice(i, 1);
        continue;
      }

      const dt = delta / 1000;
      orb.x += orb.vx * dt;
      orb.y += orb.vy * dt;
      orb.vx *= 0.98;
      orb.vy *= 0.98;
      if (orb.x < leftBound || orb.x > rightBound) orb.vx *= -1;
      if (orb.y < topBound || orb.y > bottomBound) orb.vy *= -1;
      orb.sprite.setPosition(orb.x, orb.y);

      const opponents: Array<{ f: Fighter; side: 'player' | 'npc' }> = [
        { f: this.arena.player, side: 'player' },
        { f: this.arena.npc,    side: 'npc' },
      ];
      for (const { f } of opponents) {
        if (Phaser.Math.Distance.Between(orb.x, orb.y, f.x, f.y) <= 20) {
          f.takeDamage(10);
          this.arena.spawnHitFlash(f.x, f.y, 0xffaaff);
          this.arena.showFloatingText(f.x, f.y - 36, '🌀 Chaos Orb!', '#ffaaff');
          orb.active = false;
          break;
        }
      }
    }

    // ── Incarnate (player) ────────────────────────────────────────
    const player = this.arena.player;
    const npc = this.arena.npc;

    if (this.plasmaIncarnateActive) {
      if (time > this.plasmaIncarnateEnd) {
        this.plasmaIncarnateActive = false;
        player.damageAbsorber = null;
        this.arena.setPlayerSpeedMult(1);
        if (this.arena.hasUpgrade('q')) player.setScale(1);
        if (this.plasmaIncarnateAura) { this.plasmaIncarnateAura.destroy(); this.plasmaIncarnateAura = null; }
        this.arena.showFloatingText(player.x, player.y - 36, '🔮 Incarnate ended', '#cc44ff');
      } else {
        if (this.plasmaIncarnateAura) {
          this.plasmaIncarnateAura.setPosition(player.x, player.y);
        }
        if (this.arena.hasUpgrade('q')) {
          player.setPosition(this.arena.width / 2, this.arena.height / 2);
        }

        const touchDist = Phaser.Math.Distance.Between(player.x, player.y, npc.x, npc.y);
        if (touchDist <= 36 && time - this.plasmaIncarnateLastTouch >= 1000) {
          this.plasmaIncarnateLastTouch = time;
          npc.takeDamage(50);
          this.arena.spawnHitFlash(npc.x, npc.y, 0xcc44ff);
          this.arena.showFloatingText(npc.x, npc.y - 36, '🔮 Plasma Touch!', '#ff88ff');
        }

        if (time - this.plasmaIncarnateLastChain >= 500) {
          const chainDist = Phaser.Math.Distance.Between(player.x, player.y, npc.x, npc.y);
          if (chainDist <= 200 || this.arena.hasUpgrade('q')) {
            this.plasmaIncarnateLastChain = time;
            this.doPlasmaChainLightning(player.x, player.y, npc.x, npc.y);
            npc.takeDamage(5);
          }
        }
      }
    }

    // ── Incarnate (NPC) ───────────────────────────────────────────
    if (this.npcPlasmaIncarnateActive) {
      if (time > this.npcPlasmaIncarnateEnd) {
        this.npcPlasmaIncarnateActive = false;
        npc.damageAbsorber = null;
        this.arena.setNpcSpeedMult(1);
        if (this.npcPlasmaIncarnateAura) { this.npcPlasmaIncarnateAura.destroy(); this.npcPlasmaIncarnateAura = null; }
      } else {
        if (this.npcPlasmaIncarnateAura) this.npcPlasmaIncarnateAura.setPosition(npc.x, npc.y);

        const touchDist = Phaser.Math.Distance.Between(npc.x, npc.y, player.x, player.y);
        if (touchDist <= 36 && time - this.npcPlasmaIncarnateLastTouch >= 1000) {
          this.npcPlasmaIncarnateLastTouch = time;
          player.takeDamage(50);
          this.arena.spawnHitFlash(player.x, player.y, 0xcc44ff);
          this.arena.showFloatingText(player.x, player.y - 36, '🔮 Plasma Touch!', '#ff88ff');
        }

        if (time - this.npcPlasmaIncarnateLastChain >= 500) {
          const chainDist = Phaser.Math.Distance.Between(npc.x, npc.y, player.x, player.y);
          if (chainDist <= 200) {
            this.npcPlasmaIncarnateLastChain = time;
            this.doPlasmaChainLightning(npc.x, npc.y, player.x, player.y);
            player.takeDamage(5);
          }
        }
      }
    }

    // ── Volt Points ───────────────────────────────────────────────
    for (let i = this.plasmaVoltPoints.length - 1; i >= 0; i--) {
      const vp = this.plasmaVoltPoints[i];
      if (time > vp.expiresAt || vp.charges <= 0) {
        vp.sprite.destroy();
        this.plasmaVoltPoints.splice(i, 1);
      } else {
        vp.sprite.setPosition(vp.x, vp.y);
      }
    }

    // ── Plasma Burst click blasts (staggered 0.2s apart) ──────────
    for (let i = this.plasmaClickBlasts.length - 1; i >= 0; i--) {
      const blast = this.plasmaClickBlasts[i];
      if (time >= blast.fireAt) {
        this.plasmaClickBlasts.splice(i, 1);
        this.doPlasmaClickBlast(blast.x, blast.y, blast.owner);
      }
    }

    // ── Solar: beam intersection puddles ──────────────────────────
    if (this.arena.hasPerk('player', 'solar') || this.arena.hasPerk('npc', 'solar')) {
      this.solarPuddleAccum += delta;
      if (this.solarPuddleAccum >= 500) {
        this.solarPuddleAccum -= 500;
        const activeOrbs = this.plasmaCurrentOrbs.filter(o => o.active);
        for (let i = 0; i < activeOrbs.length; i++) {
          for (let j = i + 1; j < activeOrbs.length; j++) {
            const intersection = this.segmentIntersection(
              activeOrbs[i].ax, activeOrbs[i].ay, activeOrbs[i].bx, activeOrbs[i].by,
              activeOrbs[j].ax, activeOrbs[j].ay, activeOrbs[j].bx, activeOrbs[j].by,
            );
            if (intersection) {
              const ix = intersection.x + (Math.random() - 0.5) * 20;
              const iy = intersection.y + (Math.random() - 0.5) * 20;
              this.spawnSolarPuddle(ix, iy, activeOrbs[i].owner);
            }
          }
        }
      }
    }

    // ── Solar puddles ─────────────────────────────────────────────
    for (let i = this.solarPuddles.length - 1; i >= 0; i--) {
      const p = this.solarPuddles[i];
      p.tickAccum += delta;
      if (time >= p.expiresAt) {
        p.sprite.destroy();
        this.solarPuddles.splice(i, 1);
        continue;
      }
      if (p.tickAccum >= 100) {
        p.tickAccum -= 100;
        const target = p.owner === 'player' ? this.arena.npc : this.arena.player;
        if (target.active && Phaser.Math.Distance.Between(p.sprite.x, p.sprite.y, target.x, target.y) < 14) {
          target.takeDamage(2, { source: p.sprite, sourceX: p.sprite.x, sourceY: p.sprite.y });
        }
      }
    }

    void scene;
  }

  // ── Public do* methods (called from buildPlayerContext / buildNpcContext) ──

  doPlasmaBurst(tx: number, ty: number, owner: 'player' | 'npc'): void {
    const caster = owner === 'player' ? this.arena.player : this.arena.npc;
    const now = this.arena.scene.time ? this.arena.scene.time.now : 0;

    // Arc a chain of lightning from the caster to the cursor to sell the attack.
    this.doPlasmaChainLightning(caster.x, caster.y, tx, ty);

    // Three small AoEs land at the cursor, 0.2s apart.
    for (let i = 0; i < 3; i++) {
      this.plasmaClickBlasts.push({ x: tx, y: ty, owner, fireAt: now + i * 200 });
    }
    this.arena.showFloatingText(caster.x, caster.y - 36, '⚡ Plasma Burst', '#dd66ff');
  }

  /** One staggered Plasma Burst AoE: 4 dmg to enemies at the cursor, else a red bolt back. */
  private doPlasmaClickBlast(tx: number, ty: number, owner: 'player' | 'npc'): void {
    const { scene } = this.arena;
    const caster = owner === 'player' ? this.arena.player : this.arena.npc;
    const targets = owner === 'player' ? this.arena.enemies : [this.arena.player];
    const aoeRadius = 42;
    const dmg = 4;

    // Small AoE burst + an arcing bolt from the caster to the strike point.
    const flash = scene.add.circle(tx, ty, aoeRadius, 0xdd66ff, 0.5)
      .setStrokeStyle(2, 0xffffff, 0.85).setDepth(8);
    scene.tweens.add({ targets: flash, scaleX: 1.4, scaleY: 1.4, alpha: 0, duration: 250, onComplete: () => flash.destroy() });
    this.doPlasmaChainLightning(caster.x, caster.y, tx, ty);

    // Direct hits: enemies standing inside the AoE.
    const hitSet = new Set<Fighter>();
    for (const target of targets) {
      if (!target.active || target.hp <= 0) continue;
      if (Phaser.Math.Distance.Between(tx, ty, target.x, target.y) <= aoeRadius) {
        hitSet.add(target);
      }
    }
    for (const target of hitSet) {
      target.takeDamage(dmg);
      this.arena.spawnHitFlash(target.x, target.y, 0xdd66ff);
    }

    // Click+ Chain Lightning: bolts leap from hit enemies to other nearby ones.
    if (hitSet.size > 0 && owner === 'player' && this.arena.hasUpgrade('click')) {
      const chainRange = 160;
      const queue: Fighter[] = [...hitSet];
      while (queue.length > 0) {
        const cur = queue.shift()!;
        for (const target of targets) {
          if (hitSet.has(target)) continue;
          if (!target.active || target.hp <= 0) continue;
          if (Phaser.Math.Distance.Between(cur.x, cur.y, target.x, target.y) <= chainRange) {
            hitSet.add(target);
            queue.push(target);
            this.doPlasmaChainLightning(cur.x, cur.y, target.x, target.y);
            target.takeDamage(dmg);
            this.arena.spawnHitFlash(target.x, target.y, 0xdd66ff);
          }
        }
      }
    }

    // Volt Points: any blast landing near a volt relays electricity to its partner.
    if (this.arena.hasUpgrade('r')) {
      this.doPlasmaVoltRelay(tx, ty, owner);
    }

    // Missed: a red bolt snaps back to the caster, who takes 2 self-damage.
    if (hitSet.size === 0) {
      this.doPlasmaChainLightning(tx, ty, caster.x, caster.y, 0xff2244);
      caster.takeDamage(2);
      this.arena.spawnHitFlash(caster.x, caster.y, 0xff2244);
      this.arena.showFloatingText(caster.x, caster.y - 30, '⚡ Missed!', '#ff4444');
    }
  }

  doPlasmaUnstableArena(tx: number, ty: number, owner: 'player' | 'npc'): void {
    const { scene } = this.arena;
    const baseRadius = 80;
    const radius = (owner === 'player' && this.arena.hasUpgrade('e')) ? Math.round(baseRadius * 1.2) : baseRadius;

    if (owner === 'player' && this.arena.hasUpgrade('e')) {
      const playerArenas = this.plasmaArenas.filter(a => a.owner === 'player');
      if (playerArenas.length >= 2) {
        const oldest = playerArenas[0];
        oldest.sprite.destroy();
        this.plasmaArenas.splice(this.plasmaArenas.indexOf(oldest), 1);
      }
    }

    const sprite = scene.add.circle(tx, ty, radius, 0xaa22ff, 0.15).setDepth(3);
    sprite.setStrokeStyle(3, 0xdd44ff, 0.9);
    scene.tweens.add({
      targets: sprite,
      scaleX: 1.08, scaleY: 1.08,
      alpha: 0.25,
      yoyo: true, repeat: -1,
      duration: 600,
    });

    const now = scene.time ? scene.time.now : 0;
    const expiresAt = (owner === 'player' && this.arena.hasUpgrade('e')) ? Infinity : now + 30000;
    this.plasmaArenas.push({
      sprite, x: tx, y: ty, radius,
      owner,
      playerInAccum: 0,
      npcInAccum: 0,
      expiresAt,
    });
    this.arena.showFloatingText(tx, ty - radius - 16, '⚠️ Unstable Arena!', '#aa22ff');
  }

  doPlasmaCurrentLaunch(tx: number, ty: number, owner: 'player' | 'npc'): void {
    this.doPlasmaCurrentLaunchWithSpread(tx, ty, 60, owner);
  }

  private doPlasmaCurrentLaunchWithSpread(tx: number, ty: number, spread: number, owner: 'player' | 'npc'): void {
    const { scene } = this.arena;
    const caster = owner === 'player' ? this.arena.player : this.arena.npc;
    const dx = tx - caster.x;
    const dy = ty - caster.y;
    const ang = Math.atan2(dy, dx);
    const perpX = -Math.sin(ang);
    const perpY = Math.cos(ang);
    const speed = 320;

    const ax = caster.x + perpX * spread;
    const ay = caster.y + perpY * spread;
    const bx = caster.x - perpX * spread;
    const by = caster.y - perpY * spread;

    const spriteA = scene.add.circle(ax, ay, 9, 0xcc44ff, 0.9).setStrokeStyle(2, 0xffffff, 0.8).setDepth(7);
    const spriteB = scene.add.circle(bx, by, 9, 0xcc44ff, 0.9).setStrokeStyle(2, 0xffffff, 0.8).setDepth(7);
    const chainGraphic = scene.add.graphics().setDepth(6);

    const now = scene.time ? scene.time.now : 0;
    this.plasmaCurrentOrbs.push({
      spriteA, spriteB, chainGraphic,
      ax, ay, bx, by,
      vax: Math.cos(ang) * speed, vay: Math.sin(ang) * speed,
      vbx: Math.cos(ang) * speed, vby: Math.sin(ang) * speed,
      owner,
      tickAccum: 0,
      active: true,
      expiresAt: now + 5000,
      stopped: false,
    });
  }

  doPlasmaChaosBlades(owner: 'player' | 'npc'): void {
    const { scene } = this.arena;
    const caster = owner === 'player' ? this.arena.player : this.arena.npc;
    const bladeStorm = owner === 'player' && this.arena.hasUpgrade('f');
    const count = bladeStorm ? 6 : 3;
    const speed = bladeStorm ? 475 : 380;
    const now = scene.time ? scene.time.now : 0;

    for (let i = 0; i < count; i++) {
      const ang = (i * 2 * Math.PI) / count;
      const sprite = scene.add.circle(caster.x, caster.y, 7, 0xff44ff, 0.95)
        .setStrokeStyle(2, 0xffffff, 0.8).setDepth(8);
      this.plasmaBlades.push({
        sprite,
        x: caster.x, y: caster.y,
        vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed,
        owner,
        expiresAt: now + 8000,
        spawnedAt: now,
        active: true,
      });
    }
    this.arena.showFloatingText(caster.x, caster.y - 36, '🔮 Chaos Blades!', '#ff44ff');
  }

  doPlasmaChaosIncarnate(owner: 'player' | 'npc'): void {
    const { scene } = this.arena;
    const caster = owner === 'player' ? this.arena.player : this.arena.npc;
    const duration = 5000;
    const now = scene.time ? scene.time.now : 0;

    if (owner === 'player') {
      if (this.arena.hasUpgrade('q')) {
        const cx = this.arena.width / 2, cy = this.arena.height / 2;
        this.arena.player.setPosition(cx, cy);
        caster.setScale(1.6);
        const shock = scene.add.circle(cx, cy, 20, 0xff88ff, 0.8).setDepth(9);
        scene.tweens.add({ targets: shock, scaleX: 7, scaleY: 7, alpha: 0, duration: 400, onComplete: () => shock.destroy() });
      }

      this.plasmaIncarnateActive = true;
      this.plasmaIncarnateEnd = now + duration;
      this.plasmaIncarnateLastChain = 0;

      if (this.arena.hasUpgrade('q')) {
        const npc = this.arena.npc;
        const player = this.arena.player;
        this.arena.player.damageAbsorber = () => {
          this.doPlasmaChainLightning(npc.x, npc.y, player.x, player.y);
          npc.takeDamage(10);
          this.arena.spawnHitFlash(npc.x, npc.y, 0xff2244);
          this.arena.showFloatingText(npc.x, npc.y - 36, '⚡ RETALIATION', '#ff4444');
          return true;
        };
      } else {
        this.arena.player.damageAbsorber = () => true;
      }
      this.arena.setPlayerSpeedMult(0.15);
      if (this.plasmaIncarnateAura) this.plasmaIncarnateAura.destroy();
      this.plasmaIncarnateAura = scene.add.circle(caster.x, caster.y, 32, 0xcc44ff, 0.45).setDepth(4);
      scene.tweens.add({ targets: this.plasmaIncarnateAura, scaleX: 1.2, scaleY: 1.2, alpha: 0.6, yoyo: true, repeat: -1, duration: 300 });
    } else {
      this.npcPlasmaIncarnateActive = true;
      this.npcPlasmaIncarnateEnd = now + duration;
      this.npcPlasmaIncarnateLastChain = 0;
      this.arena.npc.damageAbsorber = () => true;
      this.arena.setNpcSpeedMult(0.15);
      if (this.npcPlasmaIncarnateAura) this.npcPlasmaIncarnateAura.destroy();
      this.npcPlasmaIncarnateAura = scene.add.circle(caster.x, caster.y, 32, 0xcc44ff, 0.45).setDepth(4);
      scene.tweens.add({ targets: this.npcPlasmaIncarnateAura, scaleX: 1.2, scaleY: 1.2, alpha: 0.6, yoyo: true, repeat: -1, duration: 300 });
    }
    this.arena.showFloatingText(caster.x, caster.y - 44, '🔮 CHAOS INCARNATE!', '#ff88ff');
  }

  // ── Private helpers ───────────────────────────────────────────────

  private doPlasmaApplyChaos(target: 'player' | 'npc', durationMs = 15000): void {
    const { scene } = this.arena;
    const now = scene.time ? scene.time.now : 0;
    const existing = this.plasmaChaosEffects.findIndex(e => e.target === target);
    if (existing >= 0) {
      const old = this.plasmaChaosEffects[existing];
      if (old.aura) old.aura.destroy();
      this.plasmaChaosEffects.splice(existing, 1);
    }
    const fighter = target === 'player' ? this.arena.player : this.arena.npc;
    const aura = scene.add.circle(fighter.x, fighter.y, 22, 0xff44ff, 0.3).setDepth(4);
    scene.tweens.add({ targets: aura, alpha: 0.5, yoyo: true, repeat: -1, duration: 500 });
    this.plasmaChaosEffects.push({
      target,
      expiresAt: now + durationMs,
      tickAccum: 0,
      aura,
    });
    this.arena.showFloatingText(fighter.x, fighter.y - 36, durationMs < 5000 ? '🌀 Mini-Chaos!' : '🌀 CHAOS', '#ff44ff');
  }

  private doPlasmaSpawnChaosOrbs(x: number, y: number, owner: 'player' | 'npc'): void {
    const { scene } = this.arena;
    for (let i = 0; i < 5; i++) {
      const ang = (i / 5) * Math.PI * 2;
      const speed = 80 + Math.random() * 60;
      const sprite = scene.add.circle(x + Math.cos(ang) * 20, y + Math.sin(ang) * 20, 6, 0xffaaff, 0.9)
        .setStrokeStyle(1, 0xffffff, 0.7).setDepth(7);
      this.plasmaChaosOrbs.push({
        sprite,
        x: x + Math.cos(ang) * 20,
        y: y + Math.sin(ang) * 20,
        vx: Math.cos(ang) * speed,
        vy: Math.sin(ang) * speed,
        owner,
        active: true,
      });
    }
  }

  private doPlasmaChainLightning(fromX: number, fromY: number, toX: number, toY: number, color = 0xee88ff): void {
    const { scene } = this.arena;
    const gfx = scene.add.graphics().setDepth(8);
    gfx.lineStyle(3, color, 1.0);
    const steps = 5;
    let px = fromX, py = fromY;
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const nx = fromX + (toX - fromX) * t + (i < steps ? (Math.random() - 0.5) * 20 : 0);
      const ny = fromY + (toY - fromY) * t + (i < steps ? (Math.random() - 0.5) * 20 : 0);
      gfx.lineBetween(px, py, nx, ny);
      px = nx; py = ny;
    }
    scene.tweens.add({ targets: gfx, alpha: 0, duration: 220, onComplete: () => gfx.destroy() });
  }

  private doPlasmaSpawnVoltPoints(tx: number, ty: number, owner: 'player' | 'npc'): void {
    const { scene } = this.arena;
    const caster = owner === 'player' ? this.arena.player : this.arena.npc;
    const dx = tx - caster.x, dy = ty - caster.y;
    const ang = Math.atan2(dy, dx);
    const perpX = -Math.sin(ang), perpY = Math.cos(ang);
    const spread = 96;
    const ax = caster.x + perpX * spread, ay = caster.y + perpY * spread;
    const bx = caster.x - perpX * spread, by = caster.y - perpY * spread;

    const sprA = scene.add.circle(ax, ay, 12, 0xdd66ff, 0.8).setStrokeStyle(2, 0xffffff, 0.9).setDepth(7);
    const sprB = scene.add.circle(bx, by, 12, 0xdd66ff, 0.8).setStrokeStyle(2, 0xffffff, 0.9).setDepth(7);
    scene.tweens.add({ targets: sprA, scaleX: 1.2, scaleY: 1.2, alpha: 0.6, yoyo: true, repeat: -1, duration: 400 });
    scene.tweens.add({ targets: sprB, scaleX: 1.2, scaleY: 1.2, alpha: 0.6, yoyo: true, repeat: -1, duration: 400 });

    const now = scene.time ? scene.time.now : 0;
    const expiresAt = now + 10000;
    const voltA: PlasmaVoltPoint = { sprite: sprA, x: ax, y: ay, owner, charges: 3, expiresAt, paired: { x: bx, y: by } };
    const voltB: PlasmaVoltPoint = { sprite: sprB, x: bx, y: by, owner, charges: 3, expiresAt, paired: { x: ax, y: ay } };
    voltA.pairedRef = voltB;
    voltB.pairedRef = voltA;
    this.plasmaVoltPoints.push(voltA, voltB);
    this.arena.showFloatingText(caster.x, caster.y - 40, '⚡ VOLT POINTS!', '#dd66ff');
  }

  private doPlasmaCurrentExplode(orb: PlasmaCurrentOrb): void {
    const { scene } = this.arena;
    const cx = (orb.ax + orb.bx) / 2;
    const cy = (orb.ay + orb.by) / 2;
    const radius = 70;

    const flash = scene.add.circle(cx, cy, radius, 0xcc44ff, 0.55).setDepth(8);
    scene.tweens.add({ targets: flash, scaleX: 1.6, scaleY: 1.6, alpha: 0, duration: 350, onComplete: () => flash.destroy() });

    const player = this.arena.player;
    const npc = this.arena.npc;
    const playerDist = Phaser.Math.Distance.Between(cx, cy, player.x, player.y);
    if (playerDist <= radius) {
      player.takeDamage(10);
      this.arena.spawnHitFlash(player.x, player.y, 0xcc44ff);
    }
    const npcDist = Phaser.Math.Distance.Between(cx, cy, npc.x, npc.y);
    if (npcDist <= radius) {
      npc.takeDamage(10);
      this.arena.spawnHitFlash(npc.x, npc.y, 0xcc44ff);
    }

    orb.active = false;
  }

  private doPlasmaVoltRelay(hitX: number, hitY: number, owner: 'player' | 'npc'): void {
    const target = owner === 'player' ? this.arena.npc : this.arena.player;
    const triggerRadius = 60;
    for (const vp of this.plasmaVoltPoints) {
      if (vp.owner !== owner) continue;
      if (vp.charges <= 0) continue;
      const d = Phaser.Math.Distance.Between(hitX, hitY, vp.x, vp.y);
      if (d <= triggerRadius) {
        vp.charges--;
        const pairedVp = vp.pairedRef;
        const toX = pairedVp?.x ?? (vp.x + (Math.random() - 0.5) * 80);
        const toY = pairedVp?.y ?? (vp.y + (Math.random() - 0.5) * 80);
        this.doPlasmaChainLightning(vp.x, vp.y, toX, toY);
        const relayDist = Phaser.Math.Distance.Between(target.x, target.y, toX, toY);
        if (relayDist <= 100) {
          target.takeDamage(8);
          this.arena.spawnHitFlash(target.x, target.y, 0xdd66ff);
          this.arena.showFloatingText(target.x, target.y - 36, '⚡ VOLT RELAY', '#dd66ff');
        }
        if (pairedVp) pairedVp.charges--;
        break;
      }
    }
  }

  private doPlasmaArenaExplode(arena: PlasmaArenaZone): void {
    const { scene } = this.arena;
    const radius = arena.radius + 20;
    const flash = scene.add.circle(arena.x, arena.y, radius, 0xaa22ff, 0.6).setDepth(9);
    scene.tweens.add({ targets: flash, scaleX: 1.8, scaleY: 1.8, alpha: 0, duration: 400, onComplete: () => flash.destroy() });
    arena.sprite.destroy();

    const player = this.arena.player;
    const npc = this.arena.npc;
    const pDist = Phaser.Math.Distance.Between(arena.x, arena.y, player.x, player.y);
    if (pDist <= radius) {
      player.takeDamage(80);
      this.arena.spawnHitFlash(player.x, player.y, 0xaa22ff);
    }
    const nDist = Phaser.Math.Distance.Between(arena.x, arena.y, npc.x, npc.y);
    if (nDist <= radius) {
      npc.takeDamage(80);
      this.arena.spawnHitFlash(npc.x, npc.y, 0xaa22ff);
    }
    this.arena.showFloatingText(arena.x, arena.y - 30, '💥 ARENA EXPLOSION!', '#ff44ff');
  }

  // ── Solar helpers ─────────────────────────────────────────────────

  private doSolarEndpointExplosion(cx: number, cy: number, owner: 'player' | 'npc'): void {
    const scene = this.arena.scene;
    const flash = scene.add.circle(cx, cy, 60, 0xcc44ff, 0.5).setDepth(8);
    scene.tweens.add({ targets: flash, scaleX: 1.5, scaleY: 1.5, alpha: 0, duration: 400, onComplete: () => flash.destroy() });
    this.arena.dealAoeDamage(cx, cy, 60, 15, owner);
  }

  private segmentIntersection(
    ax: number, ay: number, bx: number, by: number,
    cx: number, cy: number, dx: number, dy: number,
  ): { x: number; y: number } | null {
    const denom = (ax - bx) * (cy - dy) - (ay - by) * (cx - dx);
    if (Math.abs(denom) < 0.001) return null;
    const t = ((ax - cx) * (cy - dy) - (ay - cy) * (cx - dx)) / denom;
    const u = -((ax - bx) * (ay - cy) - (ay - by) * (ax - cx)) / denom;
    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
      return { x: ax + t * (bx - ax), y: ay + t * (by - ay) };
    }
    return null;
  }

  private spawnSolarPuddle(x: number, y: number, owner: 'player' | 'npc'): void {
    const scene = this.arena.scene;
    const sprite = scene.add.circle(x, y, 14, 0xaa44ff, 0.55).setDepth(5);
    this.solarPuddles.push({ sprite, expiresAt: scene.time.now + 1000, tickAccum: 0, owner });
  }

  /** Returns true if point (px, py) is within `threshold` units of the segment (ax,ay)→(bx,by). */
  private pointNearSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number, threshold: number): boolean {
    const dx = bx - ax, dy = by - ay;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return Phaser.Math.Distance.Between(px, py, ax, ay) <= threshold;
    let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    const cx = ax + t * dx, cy = ay + t * dy;
    return Phaser.Math.Distance.Between(px, py, cx, cy) <= threshold;
  }
}
