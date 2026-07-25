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
  buildPlayerContext(mx: number, my: number): CastContext;
  dealAoeDamage(cx: number, cy: number, radius: number, damage: number, owner: 'player' | 'npc'): void;
  /** True only when the player is plasma AND Plasma Mastery is switched on. */
  get masteryActive(): boolean;
  /** Online: true when the opponent is plasma and has their mastery switched on. */
  get npcMasteryActive(): boolean;
  /** Mastery enhancement id bound over the given ability slot, or null if that slot is unchanged. */
  masteryBindFor(slot: string): string | null;
  /** Online: broadcast a bindable mastery cast so the peer's sim replays it. */
  broadcastMasteryCast(enhId: string): void;
  recordMasteryStat(key: string, amount: number): void;
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

/** An active Pure CHAOS! buff — one per side at most. */
interface PlasmaPureChaosState {
  owner: 'player' | 'npc';
  endsAt: number;
  /** Time until the next 5-orb volley. */
  volleyAccum: number;
  /** The crackling shell drawn around the caster. */
  gfx: Phaser.GameObjects.Graphics;
}

/** One of the 5 orbs a Pure CHAOS! volley spits out. Homes on whoever it was pointed at. */
interface PlasmaSeekerOrb {
  x: number;
  y: number;
  vx: number;
  vy: number;
  owner: 'player' | 'npc';
  target: Fighter;
  /** True when the volley found no enemy and turned on its own caster. */
  hostile: boolean;
  damage: number;
  expiresAt: number;
  active: boolean;
  /** Recent positions, newest last — drawn as a fading comet tail. */
  trail: { x: number; y: number }[];
}

/** The slow, player-sized orb Permanent Chaos leaves behind when Pure CHAOS! ends. */
interface PlasmaPermanentOrb {
  gfx: Phaser.GameObjects.Graphics;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  owner: 'player' | 'npc';
  /**
   * Inert until this timestamp. Without it the orb spawns on top of the caster who just
   * finished channelling and detonates on them the same frame.
   */
  armedAt: number;
  /** Per-fighter cooldown on the proximity strike, keyed by fighter. */
  lastStrike: Map<Fighter, number>;
  active: boolean;
}

/** How far the Permanent Chaos orb reaches out to zap anyone who wanders close. */
const PERMANENT_ORB_STRIKE_RADIUS = 110;

// ── Mastery — Chaos Storm ─────────────────────────────────────────────────

/** How long the walls take to finish closing in. */
const STORM_DURATION_MS = 120000;
/** Matches the playfield inset every other kit bounces projectiles off. */
const STORM_PAD = 32;
/** Half-width of the little square left standing at the end. */
const STORM_FINAL_HALF = 80;
const STORM_STRIKE_DAMAGE = 5;
const STORM_STRIKE_COOLDOWN_MS = 1000;

// ── Mastery — Unstable Orbital ────────────────────────────────────────────

const ORBITAL_COOLDOWN_MS = 20000;
/** The ring it launches on — also the furthest out damage can ever shove it back. */
const ORBITAL_START_RADIUS = 190;
/** Once it is this close to the caster it detonates on them. */
const ORBITAL_COLLAPSE_RADIUS = 26;
/** How fast it creeps inward, px/s. */
const ORBITAL_CLOSE_RATE = 9;
/** Push-back per point of damage the owner deals. */
const ORBITAL_PUSH_PER_DAMAGE = 1.6;
const ORBITAL_SELF_DAMAGE = 50;
const ORBITAL_ENEMY_DAMAGE = 20;
const ORBITAL_HIT_RADIUS = 24;
const ORBITAL_ENEMY_COOLDOWN_MS = 1200;
/** Orbit speed, rad/s. */
const ORBITAL_ANGULAR_SPEED = 2.5;
const ORBITAL_COLOR = 0xff2f8f;

/** The electron-style orbital summoned by Unstable Orbital. One per side at most. */
interface PlasmaOrbital {
  owner: 'player' | 'npc';
  gfx: Phaser.GameObjects.Graphics;
  /** Where the electron sits on its ring. */
  angle: number;
  /** Distance from the caster — shrinks on its own, grows when the caster deals damage. */
  radius: number;
  /** Live world position, resolved each frame so hit checks and drawing agree. */
  x: number;
  y: number;
  /** Per-victim cooldown on the 20-damage sweep. */
  lastHit: Map<Fighter, number>;
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
  private plasmaPureChaos: PlasmaPureChaosState[] = [];
  private plasmaSeekers: PlasmaSeekerOrb[] = [];
  private plasmaPermanentOrbs: PlasmaPermanentOrb[] = [];
  /** Shared canvas for every seeker body + tail; cleared and redrawn each frame. */
  private plasmaSeekerGfx: Phaser.GameObjects.Graphics | null = null;

  // ── Player R-hold state ───────────────────────────────────────────
  private plasmaRHolding = false;
  private plasmaRHeldSince = 0;
  private plasmaRPreviewA: Phaser.GameObjects.Arc | null = null;
  private plasmaRPreviewB: Phaser.GameObjects.Arc | null = null;

  // ── Solar perk state ──────────────────────────────────────────────
  private solarPuddleAccum = 0;
  private solarPuddles: { sprite: Phaser.GameObjects.Arc; expiresAt: number; tickAccum: number; owner: 'player' | 'npc' }[] = [];

  // ── Mastery — Chaos Storm ─────────────────────────────────────────
  /** Latched on the first frame the storm is live; the mastery flags aren't set yet at reset(). */
  private stormStartedAt = -1;
  private stormGfx: Phaser.GameObjects.Graphics | null = null;
  private stormLastStrike = new Map<Fighter, number>();

  // ── Mastery — Unstable Orbital ────────────────────────────────────
  private orbitals: PlasmaOrbital[] = [];
  /** Absolute timestamp — see the -COOLDOWN init so the first match starts ready. */
  private orbitalLastCastAt = -ORBITAL_COOLDOWN_MS;
  /** Enemies already wired up for the "killed while Pure CHAOS! was up" requirement. */
  private killWatched = new WeakSet<Fighter>();

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

    for (const c of this.plasmaPureChaos) c.gfx.destroy();
    this.plasmaPureChaos = [];

    this.plasmaSeekers = [];
    if (this.plasmaSeekerGfx) { this.plasmaSeekerGfx.destroy(); this.plasmaSeekerGfx = null; }

    for (const o of this.plasmaPermanentOrbs) o.gfx.destroy();
    this.plasmaPermanentOrbs = [];

    this.plasmaRHolding = false;
    this.plasmaRHeldSince = 0;
    if (this.plasmaRPreviewA) { this.plasmaRPreviewA.destroy(); this.plasmaRPreviewA = null; }
    if (this.plasmaRPreviewB) { this.plasmaRPreviewB.destroy(); this.plasmaRPreviewB = null; }

    for (const p of this.solarPuddles) p.sprite.destroy();
    this.solarPuddles = [];
    this.solarPuddleAccum = 0;

    this.stormStartedAt = -1;
    if (this.stormGfx) { this.stormGfx.destroy(); this.stormGfx = null; }
    this.stormLastStrike = new Map<Fighter, number>();

    for (const o of this.orbitals) o.gfx.destroy();
    this.orbitals = [];
    this.orbitalLastCastAt = -ORBITAL_COOLDOWN_MS;
    this.killWatched = new WeakSet<Fighter>();
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

    const playerCtx = this.arena.buildPlayerContext(mouseX, mouseY);

    // Mastery — Unstable Orbital takes over whichever slot it is bound to.
    const orbitalSlot = this.arena.masteryActive ? this.orbitalSlot() : null;
    if (orbitalSlot) {
      const key = orbitalSlot === 'e' ? eKey : orbitalSlot === 'r' ? rKey : orbitalSlot === 'f' ? fKey : qKey;
      if (Phaser.Input.Keyboard.JustDown(key)) this.tryCastOrbital(time);
    }

    // Click: Plasma Burst
    if (pointer.isDown && !pointerWasDown) {
      player.castAbility('plasma-burst', playerCtx);
    }

    // E: Unstable Arena at cursor
    if (orbitalSlot !== 'e' && Phaser.Input.Keyboard.JustDown(eKey)) {
      player.castAbility('plasma-arena', playerCtx);
    }

    // R: Plasma Current — hold to widen gap, release to fire. The whole hold/release
    // dance is gated on `rFree` so the mastery ability can own the slot outright.
    const rFree = orbitalSlot !== 'r';
    // Solar perk: if R just pressed and there's an active unstopped player current, stop it instead
    if (rFree && Phaser.Input.Keyboard.JustDown(rKey) && this.arena.hasPerk('player', 'solar')) {
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
    if (rFree && rKey.isDown && !this.plasmaRHolding) {
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
    if ((!rKey.isDown || !rFree) && this.plasmaRHolding) {
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
    if (orbitalSlot !== 'f' && Phaser.Input.Keyboard.JustDown(fKey)) {
      player.castAbility('plasma-chaos-blades', playerCtx);
    }

    // Q: Pure CHAOS!
    if (orbitalSlot !== 'q' && Phaser.Input.Keyboard.JustDown(qKey)) {
      player.castAbility('plasma-pure-chaos', playerCtx);
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
          // Mastery req: the blade itself has to land the killing blow.
          if (blade.owner === 'player' && side !== 'player' && f.hp <= 0) {
            this.arena.recordMasteryStat('chaosBladeKills', 1);
          }
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

    // ── Pure CHAOS! (both sides) ──────────────────────────────────
    for (let i = this.plasmaPureChaos.length - 1; i >= 0; i--) {
      const chaos = this.plasmaPureChaos[i];
      const caster = chaos.owner === 'player' ? this.arena.player : this.arena.npc;

      if (time >= chaos.endsAt) {
        chaos.gfx.destroy();
        this.plasmaPureChaos.splice(i, 1);
        this.arena.showFloatingText(caster.x, caster.y - 40, '⚡ Chaos spent', '#cc44ff');
        // Permanent Chaos: the storm doesn't really end, it just wanders off.
        if (chaos.owner === 'player' && this.arena.hasUpgrade('q')) {
          this.doPlasmaSpawnPermanentOrb(caster, chaos.owner, time);
        }
        continue;
      }

      this.drawChaosEnvelope(chaos.gfx, caster.x, caster.y, time, chaos.endsAt);

      chaos.volleyAccum += delta;
      if (chaos.volleyAccum >= 5000) {
        chaos.volleyAccum -= 5000;
        this.doPlasmaChaosVolley(chaos.owner);
      }
    }

    // ── Pure CHAOS! seeker orbs ───────────────────────────────────
    if (this.plasmaSeekers.length > 0 && !this.plasmaSeekerGfx) {
      this.plasmaSeekerGfx = scene.add.graphics().setDepth(8);
    }
    if (this.plasmaSeekerGfx) this.plasmaSeekerGfx.clear();

    for (let i = this.plasmaSeekers.length - 1; i >= 0; i--) {
      const seeker = this.plasmaSeekers[i];
      const target = seeker.target;
      if (!seeker.active || time > seeker.expiresAt || !target.active || target.hp <= 0) {
        this.plasmaSeekers.splice(i, 1);
        continue;
      }

      // Steer toward the target, capped so a running fighter can still shake one loose.
      const dt = delta / 1000;
      const ang = Math.atan2(target.y - seeker.y, target.x - seeker.x);
      seeker.vx += Math.cos(ang) * 900 * dt;
      seeker.vy += Math.sin(ang) * 900 * dt;
      const speed = Math.hypot(seeker.vx, seeker.vy);
      const maxSpeed = 300;
      if (speed > maxSpeed) {
        seeker.vx = (seeker.vx / speed) * maxSpeed;
        seeker.vy = (seeker.vy / speed) * maxSpeed;
      }
      seeker.x += seeker.vx * dt;
      seeker.y += seeker.vy * dt;

      seeker.trail.push({ x: seeker.x, y: seeker.y });
      if (seeker.trail.length > 7) seeker.trail.shift();

      if (Phaser.Math.Distance.Between(seeker.x, seeker.y, target.x, target.y) <= 22) {
        this.doPlasmaSeekerHit(seeker);
        this.plasmaSeekers.splice(i, 1);
        continue;
      }

      this.drawSeeker(seeker, time);
    }

    if (this.plasmaSeekers.length === 0 && this.plasmaSeekerGfx) {
      this.plasmaSeekerGfx.destroy();
      this.plasmaSeekerGfx = null;
    }

    // ── Permanent Chaos orbs ──────────────────────────────────────
    for (let i = this.plasmaPermanentOrbs.length - 1; i >= 0; i--) {
      const orb = this.plasmaPermanentOrbs[i];
      if (!orb.active) {
        orb.gfx.destroy();
        this.plasmaPermanentOrbs.splice(i, 1);
        continue;
      }

      const dt = delta / 1000;
      orb.x += orb.vx * dt;
      orb.y += orb.vy * dt;
      if (orb.x < leftBound + orb.radius)  { orb.x = leftBound + orb.radius;  orb.vx = Math.abs(orb.vx); }
      if (orb.x > rightBound - orb.radius) { orb.x = rightBound - orb.radius; orb.vx = -Math.abs(orb.vx); }
      if (orb.y < topBound + orb.radius)   { orb.y = topBound + orb.radius;   orb.vy = Math.abs(orb.vy); }
      if (orb.y > bottomBound - orb.radius){ orb.y = bottomBound - orb.radius; orb.vy = -Math.abs(orb.vy); }

      this.drawPermanentOrb(orb, time);

      if (time < orb.armedAt) continue;

      // It has no allegiance — everyone in reach gets zapped, everyone who touches it pops it.
      const orbOwnerFighter = orb.owner === 'player' ? this.arena.player : this.arena.npc;
      let popped = false;
      for (const f of [this.arena.player, this.arena.npc]) {
        if (!f.active || f.hp <= 0) continue;
        const d = Phaser.Math.Distance.Between(orb.x, orb.y, f.x, f.y);
        if (d <= orb.radius + 16) {
          this.doPlasmaPermanentOrbPop(orb, f);
          popped = true;
          break;
        }
        if (d <= PERMANENT_ORB_STRIKE_RADIUS && time - (orb.lastStrike.get(f) ?? -99999) >= 1200) {
          orb.lastStrike.set(f, time);
          this.doPlasmaChainLightning(orb.x, orb.y, f.x, f.y);
          if (f === orbOwnerFighter) f.applySelfDamage(5);
          else f.takeDamage(5);
          this.arena.spawnHitFlash(f.x, f.y, 0xdd66ff);
          this.arena.showFloatingText(f.x, f.y - 36, '⚡ Chaos Strike', '#dd66ff');
        }
      }
      if (popped) {
        orb.gfx.destroy();
        this.plasmaPermanentOrbs.splice(i, 1);
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

    // ── Mastery ───────────────────────────────────────────────────
    this.watchChaosKills();
    this.updateChaosStorm(time, delta);
    this.updateOrbitals(time, delta);

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

  doPlasmaPureChaos(owner: 'player' | 'npc'): void {
    const { scene } = this.arena;
    const caster = owner === 'player' ? this.arena.player : this.arena.npc;
    const now = scene.time ? scene.time.now : 0;

    // Recasting refreshes rather than stacking a second shell.
    const existing = this.plasmaPureChaos.findIndex(c => c.owner === owner);
    if (existing >= 0) {
      this.plasmaPureChaos[existing].gfx.destroy();
      this.plasmaPureChaos.splice(existing, 1);
    }

    const gfx = scene.add.graphics().setDepth(9);
    this.plasmaPureChaos.push({ owner, endsAt: now + 20000, volleyAccum: 0, gfx });

    // A ring of lightning slams outward as the shell ignites.
    const shock = scene.add.circle(caster.x, caster.y, 18, 0xff88ff, 0.75).setDepth(9);
    scene.tweens.add({ targets: shock, scaleX: 5, scaleY: 5, alpha: 0, duration: 450, onComplete: () => shock.destroy() });
    for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * Math.PI * 2;
      this.doPlasmaChainLightning(caster.x, caster.y, caster.x + Math.cos(ang) * 90, caster.y + Math.sin(ang) * 90);
    }

    this.arena.showFloatingText(caster.x, caster.y - 44, '⚡ PURE CHAOS!', '#ff88ff');

    // First volley lands immediately so the ult reads as a burst, not a 5s wind-up.
    this.doPlasmaChaosVolley(owner);
  }

  // ── Pure CHAOS! helpers ───────────────────────────────────────────

  /** Spit out 5 seekers. They hunt a nearby enemy for 8, or turn on the caster for 5. */
  private doPlasmaChaosVolley(owner: 'player' | 'npc'): void {
    const { scene } = this.arena;
    const caster = owner === 'player' ? this.arena.player : this.arena.npc;
    if (!caster.active || caster.hp <= 0) return;

    const now = scene.time ? scene.time.now : 0;
    const enemy = this.nearestEnemyWithin(owner, caster.x, caster.y, 280);
    const target = enemy ?? caster;
    const hostile = enemy === null;

    for (let i = 0; i < 5; i++) {
      const ang = (i / 5) * Math.PI * 2 + Math.random() * 0.4;
      // Thrown outward first, so they arc back around instead of hugging the caster.
      const launch = 210;
      this.plasmaSeekers.push({
        x: caster.x + Math.cos(ang) * 18,
        y: caster.y + Math.sin(ang) * 18,
        vx: Math.cos(ang) * launch,
        vy: Math.sin(ang) * launch,
        owner,
        target,
        hostile,
        damage: hostile ? 5 : 8,
        expiresAt: now + 6000,
        active: true,
        trail: [],
      });
    }

    this.arena.showFloatingText(
      caster.x, caster.y - 56,
      hostile ? '🌀 No target — they want YOU!' : '🌀 Chaos Volley!',
      hostile ? '#ff4466' : '#dd66ff',
    );
  }

  private doPlasmaSeekerHit(seeker: PlasmaSeekerOrb): void {
    const target = seeker.target;
    const color = seeker.hostile ? 0xff4466 : 0xdd66ff;
    if (seeker.hostile) target.applySelfDamage(seeker.damage);
    else target.takeDamage(seeker.damage);
    this.arena.spawnHitFlash(target.x, target.y, color);

    const { scene } = this.arena;
    const pop = scene.add.circle(target.x, target.y, 14, color, 0.6).setDepth(8);
    scene.tweens.add({ targets: pop, scaleX: 2.2, scaleY: 2.2, alpha: 0, duration: 220, onComplete: () => pop.destroy() });
  }

  private nearestEnemyWithin(owner: 'player' | 'npc', x: number, y: number, radius: number): Fighter | null {
    const candidates = owner === 'player' ? this.arena.enemies : [this.arena.player];
    let best: Fighter | null = null;
    let bestDist = radius;
    for (const f of candidates) {
      if (!f.active || f.hp <= 0) continue;
      const d = Phaser.Math.Distance.Between(x, y, f.x, f.y);
      if (d <= bestDist) { bestDist = d; best = f; }
    }
    return best;
  }

  /** Q+ Permanent Chaos: a slow, player-sized orb drifts off in a random direction. */
  private doPlasmaSpawnPermanentOrb(caster: Fighter, owner: 'player' | 'npc', time: number): void {
    const { scene } = this.arena;
    const ang = Math.random() * Math.PI * 2;
    const speed = 55;
    const radius = Math.max(16, Math.round(caster.displayWidth / 2));

    this.plasmaPermanentOrbs.push({
      gfx: scene.add.graphics().setDepth(7),
      // Pushed clear of the caster, then inert for a moment, so it doesn't pop on them.
      x: caster.x + Math.cos(ang) * (radius + 40),
      y: caster.y + Math.sin(ang) * (radius + 40),
      vx: Math.cos(ang) * speed,
      vy: Math.sin(ang) * speed,
      radius,
      owner,
      armedAt: time + 1500,
      lastStrike: new Map<Fighter, number>(),
      active: true,
    });

    this.arena.showFloatingText(caster.x, caster.y - 44, '♾️ PERMANENT CHAOS', '#ff88ff');
  }

  private doPlasmaPermanentOrbPop(orb: PlasmaPermanentOrb, victim: Fighter): void {
    const { scene } = this.arena;
    const orbOwnerFighter = orb.owner === 'player' ? this.arena.player : this.arena.npc;
    if (victim === orbOwnerFighter) victim.applySelfDamage(25);
    else victim.takeDamage(25);
    this.arena.spawnHitFlash(victim.x, victim.y, 0xaa22ff);
    this.arena.showFloatingText(victim.x, victim.y - 40, '💥 CHAOS BURST!', '#ff88ff');

    const flash = scene.add.circle(orb.x, orb.y, orb.radius, 0xff88ff, 0.7).setDepth(9);
    scene.tweens.add({ targets: flash, scaleX: 3.5, scaleY: 3.5, alpha: 0, duration: 380, onComplete: () => flash.destroy() });
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      this.doPlasmaChainLightning(orb.x, orb.y, orb.x + Math.cos(a) * 70, orb.y + Math.sin(a) * 70);
    }
    orb.active = false;
  }

  // ── Pure CHAOS! rendering ─────────────────────────────────────────

  /** The lightning shell wrapped around a Pure CHAOS! caster — 6 crawling, jagged spokes. */
  private drawChaosEnvelope(gfx: Phaser.GameObjects.Graphics, x: number, y: number, time: number, endsAt: number): void {
    gfx.clear();

    // The whole shell strobes in the last 4s as a "duck, it's about to end" tell.
    const flicker = endsAt - time < 4000 ? 0.55 + 0.45 * Math.sin(time * 0.022) : 1;

    gfx.fillStyle(0xaa22ff, 0.14 * flicker);
    gfx.fillCircle(x, y, 30);
    gfx.lineStyle(2, 0xdd66ff, 0.45 * flicker);
    gfx.strokeCircle(x, y, 30);

    const spin = time * 0.0035;
    for (let i = 0; i < 6; i++) {
      const base = spin + (i / 6) * Math.PI * 2 + Math.sin(time * 0.011 + i * 1.7) * 0.35;
      const inner = 11;
      const outer = 25 + Math.sin(time * 0.017 + i * 2.3) * 9;
      gfx.lineStyle(i % 2 === 0 ? 3 : 2, i % 2 === 0 ? 0xffffff : 0xee88ff, 0.9 * flicker);
      gfx.beginPath();
      gfx.moveTo(x + Math.cos(base) * inner, y + Math.sin(base) * inner);
      for (let s = 1; s <= 3; s++) {
        const t = s / 3;
        const r = inner + (outer - inner) * t;
        // Kink every segment except the tip, so the bolt forks instead of bending.
        const a = base + (s === 3 ? 0 : Math.sin(time * 0.03 + i * 3.1 + s * 2.2) * 0.28);
        gfx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
      }
      gfx.strokePath();
    }
  }

  /** A seeker body plus its fading comet tail. */
  private drawSeeker(seeker: PlasmaSeekerOrb, time: number): void {
    const gfx = this.plasmaSeekerGfx;
    if (!gfx) return;
    const color = seeker.hostile ? 0xff4466 : 0xdd66ff;

    for (let t = 1; t < seeker.trail.length; t++) {
      const a = seeker.trail[t - 1];
      const b = seeker.trail[t];
      const fade = t / seeker.trail.length;
      gfx.lineStyle(1 + fade * 3, color, 0.12 + fade * 0.4);
      gfx.lineBetween(a.x, a.y, b.x, b.y);
    }

    const pulse = 1 + 0.18 * Math.sin(time * 0.02 + seeker.x * 0.05);
    gfx.fillStyle(color, 0.9);
    gfx.fillCircle(seeker.x, seeker.y, 6 * pulse);
    gfx.fillStyle(0xffffff, 0.85);
    gfx.fillCircle(seeker.x, seeker.y, 2.5 * pulse);
  }

  /** The Permanent Chaos orb: heavy core, orbiting arcs, and a faint reach ring. */
  private drawPermanentOrb(orb: PlasmaPermanentOrb, time: number): void {
    const gfx = orb.gfx;
    gfx.clear();

    // Reach ring — shows exactly how close is too close. It sweeps in while the orb arms.
    const arming = Phaser.Math.Clamp(1 - (orb.armedAt - time) / 1500, 0, 1);
    gfx.lineStyle(1, 0xdd66ff, (0.18 + 0.07 * Math.sin(time * 0.004)) * arming);
    gfx.strokeCircle(orb.x, orb.y, PERMANENT_ORB_STRIKE_RADIUS * (2 - arming));

    const breathe = 1 + 0.06 * Math.sin(time * 0.006);
    gfx.fillStyle(0xaa22ff, 0.35);
    gfx.fillCircle(orb.x, orb.y, orb.radius * breathe);
    gfx.fillStyle(0xff88ff, 0.5);
    gfx.fillCircle(orb.x, orb.y, orb.radius * 0.55 * breathe);
    gfx.fillStyle(0xffffff, 0.8);
    gfx.fillCircle(orb.x, orb.y, orb.radius * 0.22);
    gfx.lineStyle(2, 0xffffff, 0.7);
    gfx.strokeCircle(orb.x, orb.y, orb.radius * breathe);

    // Arcs crawling over the surface.
    for (let i = 0; i < 5; i++) {
      const base = time * 0.005 + (i / 5) * Math.PI * 2;
      const r = orb.radius * (0.85 + 0.35 * Math.sin(time * 0.013 + i * 1.9));
      gfx.lineStyle(2, i % 2 === 0 ? 0xffffff : 0xee88ff, 0.75);
      gfx.beginPath();
      gfx.moveTo(orb.x + Math.cos(base) * orb.radius * 0.3, orb.y + Math.sin(base) * orb.radius * 0.3);
      for (let s = 1; s <= 3; s++) {
        const a = base + Math.sin(time * 0.02 + i * 2.7 + s) * 0.5;
        const rr = orb.radius * 0.3 + (r - orb.radius * 0.3) * (s / 3);
        gfx.lineTo(orb.x + Math.cos(a) * rr, orb.y + Math.sin(a) * rr);
      }
      gfx.strokePath();
    }
  }

  // ── Mastery — requirement tracking ────────────────────────────────

  /**
   * "Kill enemies while Pure CHAOS! is up" can't be read off any single hit — the
   * killing blow may be a seeker, a stray blade or a chaos orb. So we hang a one-shot
   * listener on every enemy the first time we see it and check the shell at death.
   */
  private watchChaosKills(): void {
    const targets: Fighter[] = [this.arena.npc, ...this.arena.enemies];
    for (const t of targets) {
      if (!t || !t.active || this.killWatched.has(t)) continue;
      this.killWatched.add(t);
      t.once('defeated', () => {
        if (this.plasmaPureChaos.some(c => c.owner === 'player')) {
          this.arena.recordMasteryStat('pureChaosKills', 1);
        }
      });
    }
  }

  // ── Mastery — Chaos Storm ─────────────────────────────────────────

  /** The safe rectangle at time `t`, or null when the storm isn't running. */
  private stormBounds(time: number): { left: number; right: number; top: number; bottom: number; ratio: number } | null {
    if (this.stormStartedAt < 0) return null;
    const W = this.arena.width;
    const H = this.arena.height;
    const ratio = Phaser.Math.Clamp((time - this.stormStartedAt) / STORM_DURATION_MS, 0, 1);
    const halfW = Phaser.Math.Linear(W / 2 - STORM_PAD, STORM_FINAL_HALF, ratio);
    const halfH = Phaser.Math.Linear(H / 2 - STORM_PAD, STORM_FINAL_HALF, ratio);
    return {
      left: W / 2 - halfW,
      right: W / 2 + halfW,
      top: H / 2 - halfH,
      bottom: H / 2 + halfH,
      ratio,
    };
  }

  private updateChaosStorm(time: number, _delta: number): void {
    const live = this.arena.masteryActive || this.arena.npcMasteryActive;
    if (!live) {
      if (this.stormGfx) { this.stormGfx.destroy(); this.stormGfx = null; }
      return;
    }
    // Latched here, not in reset() — the mastery flags aren't set yet when the kit resets.
    if (this.stormStartedAt < 0) this.stormStartedAt = time;

    const bounds = this.stormBounds(time)!;
    if (!this.stormGfx) this.stormGfx = this.arena.scene.add.graphics().setDepth(4);
    this.drawChaosStorm(this.stormGfx, bounds, time);

    // Everyone outside the live edge gets struck — the storm has no allegiance.
    const victims: Fighter[] = [this.arena.player, this.arena.npc, ...this.arena.enemies];
    for (const f of victims) {
      if (!f || !f.active || f.hp <= 0) continue;
      // Online: their own sim strikes them, so we'd otherwise double-bill the hit.
      if (f === this.arena.npc && f.netGhost) continue;
      const outside = f.x < bounds.left || f.x > bounds.right || f.y < bounds.top || f.y > bounds.bottom;
      if (!outside) continue;
      if (time - (this.stormLastStrike.get(f) ?? -99999) < STORM_STRIKE_COOLDOWN_MS) continue;
      this.stormLastStrike.set(f, time);
      this.doChaosStormStrike(f, bounds);
    }
  }

  /** A bolt drops out of the wall onto whoever strayed into it. */
  private doChaosStormStrike(victim: Fighter, bounds: { left: number; right: number; top: number; bottom: number }): void {
    const { scene } = this.arena;
    // Come down from the nearest edge so the bolt visibly belongs to the wall they touched.
    const dl = Math.abs(victim.x - bounds.left);
    const dr = Math.abs(victim.x - bounds.right);
    const dt = Math.abs(victim.y - bounds.top);
    const db = Math.abs(victim.y - bounds.bottom);
    const nearest = Math.min(dl, dr, dt, db);
    let fromX = victim.x, fromY = victim.y;
    if (nearest === dl) { fromX = bounds.left - 60; }
    else if (nearest === dr) { fromX = bounds.right + 60; }
    else if (nearest === dt) { fromY = bounds.top - 60; }
    else { fromY = bounds.bottom + 60; }

    this.doPlasmaChainLightning(fromX, fromY, victim.x, victim.y, 0xff2f8f);
    victim.takeDamage(STORM_STRIKE_DAMAGE);
    this.arena.spawnHitFlash(victim.x, victim.y, 0xff2f8f);

    const ring = scene.add.circle(victim.x, victim.y, 12, 0xff2f8f, 0)
      .setStrokeStyle(2, 0xff88cc, 0.9).setDepth(9);
    scene.tweens.add({ targets: ring, scaleX: 2.6, scaleY: 2.6, alpha: 0, duration: 260, onComplete: () => ring.destroy() });
    this.arena.showFloatingText(victim.x, victim.y - 34, '⚡ STORM WALL', '#ff88cc');
  }

  /**
   * The dead zone outside the ring, plus a crackling edge that gets angrier as the
   * walls close. Drawn as four shaded bands so the safe square stays clean.
   */
  private drawChaosStorm(
    gfx: Phaser.GameObjects.Graphics,
    b: { left: number; right: number; top: number; bottom: number; ratio: number },
    time: number,
  ): void {
    const W = this.arena.width;
    const H = this.arena.height;
    gfx.clear();

    // Condemned ground — darker and more violet the further the storm has come in.
    const deadAlpha = 0.16 + 0.16 * b.ratio;
    gfx.fillStyle(0x5a0a3a, deadAlpha);
    gfx.fillRect(0, 0, W, b.top);
    gfx.fillRect(0, b.bottom, W, H - b.bottom);
    gfx.fillRect(0, b.top, b.left, b.bottom - b.top);
    gfx.fillRect(b.right, b.top, W - b.right, b.bottom - b.top);

    // Static crawling over the dead ground — sparse, so it reads as menace not noise.
    gfx.fillStyle(0xff88cc, 0.25);
    for (let i = 0; i < 14; i++) {
      const seed = i * 97.3;
      const along = (Math.sin(time * 0.0011 + seed) * 0.5 + 0.5);
      const side = i % 4;
      let sx: number, sy: number;
      if (side === 0)      { sx = b.left + (b.right - b.left) * along; sy = b.top * (0.2 + 0.6 * ((i * 13) % 7) / 7); }
      else if (side === 1) { sx = b.left + (b.right - b.left) * along; sy = b.bottom + (H - b.bottom) * (0.2 + 0.6 * ((i * 17) % 7) / 7); }
      else if (side === 2) { sx = b.left * (0.2 + 0.6 * ((i * 11) % 7) / 7); sy = b.top + (b.bottom - b.top) * along; }
      else                 { sx = b.right + (W - b.right) * (0.2 + 0.6 * ((i * 19) % 7) / 7); sy = b.top + (b.bottom - b.top) * along; }
      gfx.fillCircle(sx, sy, 1.5 + Math.sin(time * 0.008 + seed) * 0.8);
    }

    // The live edge: a jagged bolt walking each wall, brighter the tighter the ring.
    const heat = 0.5 + 0.5 * b.ratio;
    const edges: Array<[number, number, number, number]> = [
      [b.left, b.top, b.right, b.top],
      [b.right, b.top, b.right, b.bottom],
      [b.right, b.bottom, b.left, b.bottom],
      [b.left, b.bottom, b.left, b.top],
    ];
    for (let e = 0; e < edges.length; e++) {
      const [x1, y1, x2, y2] = edges[e];
      const len = Math.hypot(x2 - x1, y2 - y1);
      const nx = -(y2 - y1) / len;
      const ny = (x2 - x1) / len;
      const steps = Math.max(6, Math.round(len / 34));

      gfx.lineStyle(3, 0xff2f8f, 0.35 + 0.25 * heat);
      gfx.beginPath();
      gfx.moveTo(x1, y1);
      for (let s = 1; s <= steps; s++) {
        const t = s / steps;
        const wob = s === steps ? 0 : Math.sin(time * 0.006 + e * 2.1 + s * 1.7) * (3 + 5 * heat);
        gfx.lineTo(x1 + (x2 - x1) * t + nx * wob, y1 + (y2 - y1) * t + ny * wob);
      }
      gfx.strokePath();

      // A thin white core that flickers independently — reads as a live arc.
      gfx.lineStyle(1, 0xffffff, 0.45 + 0.35 * Math.abs(Math.sin(time * 0.009 + e)));
      gfx.beginPath();
      gfx.moveTo(x1, y1);
      for (let s = 1; s <= steps; s++) {
        const t = s / steps;
        const wob = s === steps ? 0 : Math.sin(time * 0.011 + e * 3.3 + s * 2.4) * (2 + 3 * heat);
        gfx.lineTo(x1 + (x2 - x1) * t + nx * wob, y1 + (y2 - y1) * t + ny * wob);
      }
      gfx.strokePath();
    }

    // Corner nodes — the anchors the wall is being reeled in towards.
    const pulse = 4 + Math.sin(time * 0.007) * 1.6;
    for (const [cx, cy] of [[b.left, b.top], [b.right, b.top], [b.right, b.bottom], [b.left, b.bottom]]) {
      gfx.fillStyle(0xff2f8f, 0.7);
      gfx.fillCircle(cx, cy, pulse);
      gfx.fillStyle(0xffffff, 0.85);
      gfx.fillCircle(cx, cy, pulse * 0.4);
    }
  }

  // ── Mastery — Unstable Orbital ────────────────────────────────────

  private orbitalSlot(): 'e' | 'r' | 'f' | 'q' | null {
    for (const s of ['e', 'r', 'f', 'q'] as const) {
      if (this.arena.masteryBindFor(s) === 'unstable-orbital') return s;
    }
    return null;
  }

  /** Ability-bar fill: full while it is circling, otherwise the recharge. */
  getOrbitalCooldownRatio(time: number): number {
    if (this.orbitals.some(o => o.owner === 'player')) return 1;
    return Math.min(1, (time - this.orbitalLastCastAt) / ORBITAL_COOLDOWN_MS);
  }

  private tryCastOrbital(time: number): void {
    if (this.orbitals.some(o => o.owner === 'player')) return;
    if (time - this.orbitalLastCastAt < ORBITAL_COOLDOWN_MS) return;
    this.orbitalLastCastAt = time;
    this.spawnOrbital('player');
    this.arena.broadcastMasteryCast('unstable-orbital');
  }

  /** Online replay: the remote plasma player put an orbital up around themselves. */
  doNpcUnstableOrbital(): void {
    if (this.orbitals.some(o => o.owner === 'npc')) return;
    this.spawnOrbital('npc');
  }

  private spawnOrbital(owner: 'player' | 'npc'): void {
    const { scene } = this.arena;
    const caster = owner === 'player' ? this.arena.player : this.arena.npc;
    this.orbitals.push({
      owner,
      gfx: scene.add.graphics().setDepth(9),
      angle: Math.random() * Math.PI * 2,
      radius: ORBITAL_START_RADIUS,
      x: caster.x + ORBITAL_START_RADIUS,
      y: caster.y,
      lastHit: new Map<Fighter, number>(),
    });

    const flare = scene.add.circle(caster.x, caster.y, ORBITAL_START_RADIUS, ORBITAL_COLOR, 0)
      .setStrokeStyle(3, ORBITAL_COLOR, 0.8).setDepth(9);
    scene.tweens.add({ targets: flare, scaleX: 0.6, scaleY: 0.6, alpha: 0, duration: 480, onComplete: () => flare.destroy() });
    this.arena.showFloatingText(caster.x, caster.y - 44, '⚛️ UNSTABLE ORBITAL', '#ff2f8f');
  }

  /**
   * Damage the owner dealt shoves their orbital back out. Wired from ArenaScene's
   * `damaged` listeners, so any source counts — that's the whole point of the ability.
   */
  onDamageDealt(owner: 'player' | 'npc', amount: number): void {
    if (amount <= 0) return;
    const orb = this.orbitals.find(o => o.owner === owner);
    if (!orb) return;
    const before = orb.radius;
    orb.radius = Math.min(ORBITAL_START_RADIUS, orb.radius + amount * ORBITAL_PUSH_PER_DAMAGE);
    if (orb.radius - before > 12) {
      const caster = owner === 'player' ? this.arena.player : this.arena.npc;
      this.arena.showFloatingText(caster.x, caster.y - 52, '⚛️ pushed back', '#ff88cc');
    }
  }

  private updateOrbitals(time: number, delta: number): void {
    const dt = delta / 1000;
    for (let i = this.orbitals.length - 1; i >= 0; i--) {
      const orb = this.orbitals[i];
      const caster = orb.owner === 'player' ? this.arena.player : this.arena.npc;
      if (!caster.active || caster.hp <= 0) {
        orb.gfx.destroy();
        this.orbitals.splice(i, 1);
        continue;
      }

      orb.angle += ORBITAL_ANGULAR_SPEED * dt;
      orb.radius -= ORBITAL_CLOSE_RATE * dt;

      // Electron-around-a-nucleus: a squashed ring whose plane slowly precesses.
      const tilt = time * 0.0004 + (orb.owner === 'npc' ? Math.PI / 3 : 0);
      const ox = Math.cos(orb.angle) * orb.radius;
      const oy = Math.sin(orb.angle) * orb.radius * 0.42;
      orb.x = caster.x + ox * Math.cos(tilt) - oy * Math.sin(tilt);
      orb.y = caster.y + ox * Math.sin(tilt) + oy * Math.cos(tilt);

      this.drawOrbital(orb, caster, tilt, time);

      // Collapse: it finally reaches the caster.
      if (orb.radius <= ORBITAL_COLLAPSE_RADIUS) {
        this.doOrbitalCollapse(orb, caster);
        orb.gfx.destroy();
        this.orbitals.splice(i, 1);
        continue;
      }

      // Sweep: anything that isn't the caster takes a solid hit.
      const victims: Fighter[] = orb.owner === 'player'
        ? [...this.arena.enemies, this.arena.npc]
        : [this.arena.player];
      const seen = new Set<Fighter>();
      for (const f of victims) {
        if (!f || f === caster || seen.has(f)) continue;
        seen.add(f);
        if (!f.active || f.hp <= 0) continue;
        if (Phaser.Math.Distance.Between(orb.x, orb.y, f.x, f.y) > ORBITAL_HIT_RADIUS + 14) continue;
        if (time - (orb.lastHit.get(f) ?? -99999) < ORBITAL_ENEMY_COOLDOWN_MS) continue;
        orb.lastHit.set(f, time);
        f.takeDamage(ORBITAL_ENEMY_DAMAGE);
        this.arena.spawnHitFlash(f.x, f.y, ORBITAL_COLOR);
        this.arena.showFloatingText(f.x, f.y - 36, '⚛️ ORBITAL', '#ff2f8f');
        this.doPlasmaChainLightning(orb.x, orb.y, f.x, f.y, ORBITAL_COLOR);
      }
    }
  }

  private doOrbitalCollapse(orb: PlasmaOrbital, caster: Fighter): void {
    const { scene } = this.arena;
    // Online: the remote player's own sim detonates their orbital on them.
    if (!(orb.owner === 'npc' && caster.netGhost)) {
      caster.applySelfDamage(ORBITAL_SELF_DAMAGE);
      this.arena.spawnHitFlash(caster.x, caster.y, ORBITAL_COLOR);
    }
    this.arena.showFloatingText(caster.x, caster.y - 44, '⚛️ ORBITAL COLLAPSE!', '#ff2f8f');

    const flash = scene.add.circle(caster.x, caster.y, 30, ORBITAL_COLOR, 0.7).setDepth(10);
    scene.tweens.add({ targets: flash, scaleX: 3.2, scaleY: 3.2, alpha: 0, duration: 400, onComplete: () => flash.destroy() });
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      this.doPlasmaChainLightning(caster.x, caster.y, caster.x + Math.cos(a) * 80, caster.y + Math.sin(a) * 80, ORBITAL_COLOR);
    }
  }

  /** Nucleus glow, the tilted orbit path, and the electron itself with a hot tail. */
  private drawOrbital(orb: PlasmaOrbital, caster: Fighter, tilt: number, time: number): void {
    const gfx = orb.gfx;
    gfx.clear();

    // Danger read: the ring goes from pink to white-hot as it closes on the caster.
    const closeness = Phaser.Math.Clamp(
      1 - (orb.radius - ORBITAL_COLLAPSE_RADIUS) / (ORBITAL_START_RADIUS - ORBITAL_COLLAPSE_RADIUS), 0, 1,
    );
    const urgency = closeness > 0.7 ? 0.55 + 0.45 * Math.sin(time * 0.02) : 1;

    // The orbit path itself — a squashed, tilted ellipse.
    gfx.lineStyle(1.5, ORBITAL_COLOR, (0.2 + 0.4 * closeness) * urgency);
    gfx.beginPath();
    for (let s = 0; s <= 48; s++) {
      const a = (s / 48) * Math.PI * 2;
      const px = Math.cos(a) * orb.radius;
      const py = Math.sin(a) * orb.radius * 0.42;
      const wx = caster.x + px * Math.cos(tilt) - py * Math.sin(tilt);
      const wy = caster.y + px * Math.sin(tilt) + py * Math.cos(tilt);
      if (s === 0) gfx.moveTo(wx, wy); else gfx.lineTo(wx, wy);
    }
    gfx.strokePath();

    // Nucleus haze on the caster, so it's obvious who the orbital belongs to.
    gfx.fillStyle(ORBITAL_COLOR, 0.1 + 0.16 * closeness);
    gfx.fillCircle(caster.x, caster.y, 16 + 8 * closeness);

    // Trailing arc behind the electron.
    for (let s = 1; s <= 8; s++) {
      const a = orb.angle - s * 0.09;
      const px = Math.cos(a) * orb.radius;
      const py = Math.sin(a) * orb.radius * 0.42;
      const wx = caster.x + px * Math.cos(tilt) - py * Math.sin(tilt);
      const wy = caster.y + px * Math.sin(tilt) + py * Math.cos(tilt);
      const fade = 1 - s / 9;
      gfx.fillStyle(ORBITAL_COLOR, 0.35 * fade * urgency);
      gfx.fillCircle(wx, wy, 7 * fade);
    }

    // The electron: a pulsing plasma bead with a white core and a few stray arcs.
    const beat = 1 + 0.2 * Math.sin(time * 0.018);
    gfx.fillStyle(ORBITAL_COLOR, 0.9 * urgency);
    gfx.fillCircle(orb.x, orb.y, 11 * beat);
    gfx.fillStyle(0xffaadd, 0.85);
    gfx.fillCircle(orb.x, orb.y, 6.5 * beat);
    gfx.fillStyle(0xffffff, 0.95);
    gfx.fillCircle(orb.x, orb.y, 2.8 * beat);
    for (let i = 0; i < 4; i++) {
      const a = time * 0.014 + (i / 4) * Math.PI * 2;
      const r = 11 * beat + 5 + Math.sin(time * 0.03 + i * 2.2) * 4;
      gfx.lineStyle(1.5, 0xffffff, 0.5 * urgency);
      gfx.lineBetween(
        orb.x + Math.cos(a) * 5, orb.y + Math.sin(a) * 5,
        orb.x + Math.cos(a + 0.4) * r, orb.y + Math.sin(a + 0.4) * r,
      );
    }
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
          if (owner === 'player') this.arena.recordMasteryStat('voltRelays', 1);
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
      // Mastery req: the floor crumbling under an enemy, not under you.
      if (arena.owner === 'player') this.arena.recordMasteryStat('arenaCrumbles', 1);
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
