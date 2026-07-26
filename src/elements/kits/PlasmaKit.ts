import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';
import { CastContext } from '../Ability';
import {
  ArmGesture, PLASMA, PlasmaAura, PlasmaAuraStyle, PlasmaAvatar, PlasmaColorFn, PlasmaFx,
  arcBolt, plasmaBead,
} from './PlasmaVisuals';

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
  readonly elementId: string;
  readonly npcElementId: string;
  readonly npcCastId: string | null;
  /** `(owner, base) => displayed` — the owner's colour cosmetic, or the identity. */
  plasmaColor(owner: 'player' | 'npc', base: number): number;
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
//
// Every world object here is plain data painted into the kit's own Graphics layers — nothing
// owns a sprite, so an orb can boil, a blade can spin and a zone can crackle.

interface PlasmaArenaZone {
  x: number;
  y: number;
  radius: number;
  owner: 'player' | 'npc';
  playerInAccum: number;
  npcInAccum: number;
  expiresAt: number;
}

interface PlasmaCurrentOrb {
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
}

interface PlasmaChaosOrb {
  x: number;
  y: number;
  vx: number;
  vy: number;
  owner: 'player' | 'npc';
  active: boolean;
}

interface PlasmaVoltPoint {
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
const ORBITAL_COLOR = PLASMA.hot;

/** Every ability drives an arm gesture, on the NPC rig as well as the player's. */
const CAST_GESTURES: Record<string, ArmGesture> = {
  'plasma-burst': 'punch',
  'plasma-arena': 'slam',
  'plasma-current': 'clap',
  'plasma-chaos-blades': 'sweep',
  'plasma-pure-chaos': 'raise',
};

/** The electron-style orbital summoned by Unstable Orbital. One per side at most. */
interface PlasmaOrbital {
  owner: 'player' | 'npc';
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
  // ── Visuals ────────────────────────────────────────────────────────────
  /** Colour mappers + effect painters, one per owner so a colour cosmetic recolours one side. */
  private readonly pcol: PlasmaColorFn;
  private readonly ncol: PlasmaColorFn;
  private readonly pfx: PlasmaFx;
  private readonly nfx: PlasmaFx;
  /** The caged-lightning rig (containment hands, eyes, forked crown) for each plasma fighter. */
  private playerAvatar: PlasmaAvatar | null = null;
  private npcAvatar: PlasmaAvatar | null = null;
  /** Stance tells, per side where both can run one. */
  private auras: Partial<Record<`${'player' | 'npc'}:${PlasmaAuraStyle}`, PlasmaAura>> = {};
  /**
   * Two layers, because these objects are not all in the same place. Zones, scorches and the
   * storm lie on the floor and pass *under* the fighters; orbs, blades, currents and seekers fly
   * over them.
   */
  private groundGfx: Phaser.GameObjects.Graphics | null = null;
  private airGfx: Phaser.GameObjects.Graphics | null = null;
  /** Shared animation clock for every per-frame painter in this kit. */
  private vizT = 0;
  /** Last cursor position, cached in handleInput — `update` has no pointer. */
  private lastAimX = 0;
  private lastAimY = 0;

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

  // ── Player R-hold state ───────────────────────────────────────────
  private plasmaRHolding = false;
  private plasmaRHeldSince = 0;
  /** Where the two orbs would launch from if R were released right now, or null. */
  private plasmaRPreview: { ax: number; ay: number; bx: number; by: number; ratio: number } | null = null;

  // ── Solar perk state ──────────────────────────────────────────────
  private solarPuddleAccum = 0;
  private solarPuddles: { x: number; y: number; expiresAt: number; tickAccum: number; owner: 'player' | 'npc' }[] = [];

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

  constructor(private arena: PlasmaArenaApi) {
    // Built here, not as field initialisers, so they see the injected arena.
    this.pcol = (base) => arena.plasmaColor('player', base);
    this.ncol = (base) => arena.plasmaColor('npc', base);
    this.pfx = new PlasmaFx(arena.scene, this.pcol);
    this.nfx = new PlasmaFx(arena.scene, this.ncol);
  }

  // ── Visual helpers ─────────────────────────────────────────────────────

  /** Effect painter for a side. */
  private fx(owner: 'player' | 'npc'): PlasmaFx { return owner === 'player' ? this.pfx : this.nfx; }
  /** Colour mapper for a side. */
  private col(owner: 'player' | 'npc'): PlasmaColorFn { return owner === 'player' ? this.pcol : this.ncol; }
  /** The rig for a side, if that side is playing Plasma. */
  private avatar(owner: 'player' | 'npc'): PlasmaAvatar | null {
    return owner === 'player' ? this.playerAvatar : this.npcAvatar;
  }
  private fighter(owner: 'player' | 'npc'): Fighter {
    return owner === 'player' ? this.arena.player : this.arena.npc;
  }

  /** The floor layer, under the fighters. Rebuilt lazily after a reset. */
  private ground(): Phaser.GameObjects.Graphics {
    if (!this.groundGfx || !this.groundGfx.active) {
      this.groundGfx = this.arena.scene.add.graphics().setDepth(3);
    }
    return this.groundGfx;
  }

  /** The flying layer, over the fighters. Rebuilt lazily after a reset. */
  private air(): Phaser.GameObjects.Graphics {
    if (!this.airGfx || !this.airGfx.active) {
      this.airGfx = this.arena.scene.add.graphics().setDepth(10);
    }
    return this.airGfx;
  }

  /** Build/tear down one stance aura from a single "is it up?" flag. */
  private syncAura(
    owner: 'player' | 'npc', style: PlasmaAuraStyle, on: boolean,
    delta: number, intensity: number, angle: number, radius = 26,
  ): void {
    const key = `${owner}:${style}` as const;
    let aura = this.auras[key];
    const f = this.fighter(owner);
    if (!on || !f.active) {
      if (aura) { aura.destroy(); delete this.auras[key]; }
      return;
    }
    if (!aura) {
      aura = new PlasmaAura(this.arena.scene, this.col(owner), style, radius, style === 'pure' ? 9 : 4);
      this.auras[key] = aura;
    }
    aura.setIntensity(intensity);
    aura.setAngle(angle);
    aura.update(delta, f.x, f.y, f.forceInvisible ? 0 : f.alpha);
  }

  private destroyAuras(): void {
    for (const a of Object.values(this.auras)) a?.destroy();
    this.auras = {};
  }

  // ── reset ─────────────────────────────────────────────────────────

  reset(): void {
    // Visuals — every GameObject dies with the old scene run, so rebuild lazily in update().
    if (this.playerAvatar) { this.playerAvatar.destroy(); this.playerAvatar = null; }
    if (this.npcAvatar) { this.npcAvatar.destroy(); this.npcAvatar = null; }
    this.destroyAuras();
    if (this.groundGfx) { this.groundGfx.destroy(); this.groundGfx = null; }
    if (this.airGfx) { this.airGfx.destroy(); this.airGfx = null; }
    this.vizT = 0;

    this.plasmaArenas = [];
    this.plasmaCurrentOrbs = [];
    this.plasmaBlades = [];
    this.plasmaChaosEffects = [];
    this.plasmaChaosOrbs = [];
    this.plasmaVoltPoints = [];
    this.plasmaClickBlasts = [];
    this.plasmaPureChaos = [];
    this.plasmaSeekers = [];
    this.plasmaPermanentOrbs = [];

    this.plasmaRHolding = false;
    this.plasmaRHeldSince = 0;
    this.plasmaRPreview = null;

    this.solarPuddles = [];
    this.solarPuddleAccum = 0;

    this.stormStartedAt = -1;
    if (this.stormGfx) { this.stormGfx.destroy(); this.stormGfx = null; }
    this.stormLastStrike = new Map<Fighter, number>();

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

    this.lastAimX = mouseX;
    this.lastAimY = mouseY;
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
      // Painted in paintWorld: two beads of held charge with the current already arcing between
      // them, so the wind-up shows exactly what is about to launch.
      this.plasmaRPreview = { ax, ay, bx, by, ratio: voltMode ? 1 : Math.min(1, heldMs / 1500) };
    }
    if ((!rKey.isDown || !rFree) && this.plasmaRHolding) {
      this.plasmaRHolding = false;
      this.plasmaRPreview = null;
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
    this.vizT += delta / 1000;
    this.mirrorNpcCast();
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
        this.plasmaCurrentOrbs.splice(i, 1);
        continue;
      }

      const dt = delta / 1000;
      orb.ax += orb.vax * dt;
      orb.ay += orb.vay * dt;
      orb.bx += orb.vbx * dt;
      orb.by += orb.vby * dt;

      if (orb.ax < 0 || orb.ax > W || orb.ay < 0 || orb.ay > H ||
          orb.bx < 0 || orb.bx > W || orb.by < 0 || orb.by > H) {
        orb.active = false;
        continue;
      }

      const chainTargets = orb.owner === 'player' ? this.arena.enemies : [this.arena.player];
      let chainCollapsed = false;
      for (const hitTarget of chainTargets) {
        if (!hitTarget.active || hitTarget.hp <= 0) continue;
        const dA = Phaser.Math.Distance.Between(orb.ax, orb.ay, hitTarget.x, hitTarget.y);
        const dB = Phaser.Math.Distance.Between(orb.bx, orb.by, hitTarget.x, hitTarget.y);
        if (dA <= 20 || dB <= 20) {
          const hx = hitTarget.x, hy = hitTarget.y;
          hitTarget.takeDamage(10);
          this.arena.spawnHitFlash(hitTarget.x, hitTarget.y, 0xcc44ff);
          this.fx(orb.owner).motes(hx, hy, 6, { speed: 220, size: 5, color: PLASMA.orchid, depth: 9 });
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
        // A blade burning out throws its last charge loose rather than blinking away.
        if (time > blade.expiresAt) {
          this.fx(blade.owner).motes(blade.x, blade.y, 4, { speed: 90, size: 4, color: PLASMA.pink, depth: 8 });
        }
        this.plasmaBlades.splice(i, 1);
        continue;
      }

      const dt = delta / 1000;
      blade.x += blade.vx * dt;
      blade.y += blade.vy * dt;

      // A wall bounce throws sparks, so a rebound reads as a hit on the arena itself.
      let bounced = false;
      if (blade.x < leftBound) { blade.x = leftBound; blade.vx = Math.abs(blade.vx); bounced = true; }
      if (blade.x > rightBound) { blade.x = rightBound; blade.vx = -Math.abs(blade.vx); bounced = true; }
      if (blade.y < topBound) { blade.y = topBound; blade.vy = Math.abs(blade.vy); bounced = true; }
      if (blade.y > bottomBound) { blade.y = bottomBound; blade.vy = -Math.abs(blade.vy); bounced = true; }
      if (bounced) {
        this.fx(blade.owner).motes(blade.x, blade.y, 3, {
          speed: 120, angle: Math.atan2(blade.vy, blade.vx), spread: 1, size: 3.4, color: PLASMA.pink, depth: 8,
        });
      }

      const ownerGrace = time < blade.spawnedAt + 2000;
      const fighterChecks: Array<{ f: Fighter; side: 'player' | 'npc' }> = [
        { f: this.arena.player, side: 'player' },
        { f: this.arena.npc,    side: 'npc' },
      ];
      for (const { f, side } of fighterChecks) {
        if (ownerGrace && side === blade.owner) continue;
        const d = Phaser.Math.Distance.Between(blade.x, blade.y, f.x, f.y);
        if (d <= 20) {
          const hx = f.x, hy = f.y;
          f.takeDamage(8);
          this.arena.spawnHitFlash(f.x, f.y, 0xff44ff);
          // The blade biting: a fork through the victim and plasma spat out the far side.
          const bfx = this.fx(blade.owner);
          bfx.discharge(hx, hy, 34, 5, PLASMA.pink, 260, 9);
          bfx.motes(hx, hy, 4, { speed: 200, size: 4, color: PLASMA.pink, depth: 9 });
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
        this.plasmaChaosEffects.splice(i, 1);
        continue;
      }
      const fighter = effect.target === 'player' ? this.arena.player : this.arena.npc;

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

      const opponents: Array<{ f: Fighter; side: 'player' | 'npc' }> = [
        { f: this.arena.player, side: 'player' },
        { f: this.arena.npc,    side: 'npc' },
      ];
      for (const { f } of opponents) {
        if (Phaser.Math.Distance.Between(orb.x, orb.y, f.x, f.y) <= 20) {
          const hx = orb.x, hy = orb.y;
          f.takeDamage(10);
          this.arena.spawnHitFlash(f.x, f.y, 0xffaaff);
          // Popped: the containment lets go and the charge sprays out of it.
          this.fx(orb.owner).discharge(hx, hy, 30, 6, PLASMA.blush, 250, 9);
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
        this.plasmaPureChaos.splice(i, 1);
        // The cage failing: everything it was holding goes out at once.
        this.fx(chaos.owner).discharge(caster.x, caster.y, 96, 10, PLASMA.magenta, 420, 9);
        this.arena.showFloatingText(caster.x, caster.y - 40, '⚡ Chaos spent', '#cc44ff');
        // Permanent Chaos: the storm doesn't really end, it just wanders off.
        if (chaos.owner === 'player' && this.arena.hasUpgrade('q')) {
          this.doPlasmaSpawnPermanentOrb(caster, chaos.owner, time);
        }
        continue;
      }

      chaos.volleyAccum += delta;
      if (chaos.volleyAccum >= 5000) {
        chaos.volleyAccum -= 5000;
        this.doPlasmaChaosVolley(chaos.owner);
      }
    }

    // ── Pure CHAOS! seeker orbs ───────────────────────────────────
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
    }

    // ── Permanent Chaos orbs ──────────────────────────────────────
    for (let i = this.plasmaPermanentOrbs.length - 1; i >= 0; i--) {
      const orb = this.plasmaPermanentOrbs[i];
      if (!orb.active) {
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
      if (popped) this.plasmaPermanentOrbs.splice(i, 1);
    }

    // ── Volt Points ───────────────────────────────────────────────
    for (let i = this.plasmaVoltPoints.length - 1; i >= 0; i--) {
      const vp = this.plasmaVoltPoints[i];
      if (time > vp.expiresAt || vp.charges <= 0) this.plasmaVoltPoints.splice(i, 1);
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
        this.solarPuddles.splice(i, 1);
        continue;
      }
      if (p.tickAccum >= 100) {
        p.tickAccum -= 100;
        const target = p.owner === 'player' ? this.arena.npc : this.arena.player;
        if (target.active && Phaser.Math.Distance.Between(p.x, p.y, target.x, target.y) < 14) {
          target.takeDamage(2, { sourceX: p.x, sourceY: p.y });
        }
      }
    }

    this.paintWorld(time);
    this.updateAvatars(time, delta);
    void scene;
  }

  /** Mirror the player's gestures on the NPC rig, so a plasma opponent visibly casts. */
  private mirrorNpcCast(): void {
    const id = this.arena.npcCastId;
    if (!id) return;
    const gesture = CAST_GESTURES[id];
    if (!gesture) return;
    const { npc, player } = this.arena;
    this.npcAvatar?.play(gesture, Math.atan2(player.y - npc.y, player.x - npc.x));
  }

  /**
   * Every per-frame painter in one pass. The two layers are cleared and redrawn from live state,
   * so a zone crackles, an orb boils and a current arcs rather than sitting there as a sprite.
   */
  private paintWorld(time: number): void {
    const t = this.vizT;

    // ── Floor ──
    const hasGround = this.plasmaArenas.length > 0 || this.solarPuddles.length > 0;
    if (hasGround || this.groundGfx) {
      const g = this.ground();
      g.clear();
      for (const z of this.plasmaArenas) {
        const urgency = Math.max(z.playerInAccum, z.npcInAccum) / 3000;
        PlasmaFx.drawZone(g, this.col(z.owner), z.x, z.y, z.radius, Phaser.Math.Clamp(urgency, 0, 1), t);
      }
      for (const p of this.solarPuddles) {
        plasmaBead(g, this.col(p.owner), p.x, p.y, 9, t, PLASMA.purple, 0.8, 3);
      }
    }

    // ── Air ──
    const hasAir = this.plasmaCurrentOrbs.length > 0 || this.plasmaBlades.length > 0
      || this.plasmaChaosOrbs.length > 0 || this.plasmaVoltPoints.length > 0
      || this.plasmaSeekers.length > 0 || this.plasmaPermanentOrbs.length > 0
      || this.orbitals.length > 0 || this.plasmaRPreview !== null;
    if (hasAir || this.airGfx) {
      const g = this.air();
      g.clear();

      // The R wind-up: the pair already live, with the current stretched between them.
      const pv = this.plasmaRPreview;
      if (pv) {
        arcBolt(g, this.pcol, pv.ax, pv.ay, pv.bx, pv.by, 14, t * 60, 2.2 + pv.ratio * 1.6,
          PLASMA.orchid, 0.4 + pv.ratio * 0.5, 9);
        plasmaBead(g, this.pcol, pv.ax, pv.ay, 6 + pv.ratio * 4, t, PLASMA.orchid, 0.75, 3);
        plasmaBead(g, this.pcol, pv.bx, pv.by, 6 + pv.ratio * 4, t + 0.3, PLASMA.orchid, 0.75, 3);
      }

      for (const o of this.plasmaCurrentOrbs) {
        PlasmaFx.drawCurrent(g, this.col(o.owner), o.ax, o.ay, o.bx, o.by, o.stopped, t);
      }
      for (const vp of this.plasmaVoltPoints) {
        PlasmaFx.drawVoltPoint(g, this.col(vp.owner), vp.x, vp.y, vp.charges, t);
      }
      for (const b of this.plasmaBlades) {
        PlasmaFx.drawBlade(g, this.col(b.owner), b.x, b.y, Math.atan2(b.vy, b.vx) + t * 9, t);
      }
      for (const o of this.plasmaChaosOrbs) {
        plasmaBead(g, this.col(o.owner), o.x, o.y, 6, t + o.x * 0.01, PLASMA.blush, 0.95, 3);
      }
      for (const s of this.plasmaSeekers) {
        PlasmaFx.drawSeeker(g, this.col(s.owner), s.x, s.y, s.trail, s.hostile, t);
      }
      for (const o of this.plasmaPermanentOrbs) {
        const arming = Phaser.Math.Clamp(1 - (o.armedAt - time) / 1500, 0, 1);
        PlasmaFx.drawPermanentOrb(g, this.col(o.owner), o.x, o.y, o.radius, PERMANENT_ORB_STRIKE_RADIUS, arming, t);
      }
      for (const orb of this.orbitals) {
        const caster = this.fighter(orb.owner);
        const tilt = time * 0.0004 + (orb.owner === 'npc' ? Math.PI / 3 : 0);
        const closeness = Phaser.Math.Clamp(
          1 - (orb.radius - ORBITAL_COLLAPSE_RADIUS) / (ORBITAL_START_RADIUS - ORBITAL_COLLAPSE_RADIUS), 0, 1,
        );
        PlasmaFx.drawOrbital(g, this.col(orb.owner), caster.x, caster.y, orb.x, orb.y,
          orb.radius, orb.angle, tilt, closeness, t);
      }
    }
  }

  /**
   * The character rigs and every stance aura, for whichever sides are playing Plasma. Built
   * lazily so a scene restart (which destroys them all) simply rebuilds on the next frame, and
   * torn down the moment a side stops being Plasma.
   */
  private updateAvatars(time: number, delta: number): void {
    const { scene, player, npc } = this.arena;
    const isPlayerPlasma = this.arena.elementId === 'plasma';
    const isNpcPlasma = this.arena.npcElementId === 'plasma';

    for (const owner of ['player', 'npc'] as const) {
      const isPlasma = owner === 'player' ? isPlayerPlasma : isNpcPlasma;
      const f = owner === 'player' ? player : npc;
      let av = this.avatar(owner);

      if (!isPlasma || !f.active) {
        if (av) {
          av.destroy();
          if (owner === 'player') this.playerAvatar = null; else this.npcAvatar = null;
          for (const style of ['chaos', 'pure', 'wind'] as const) {
            this.auras[`${owner}:${style}`]?.destroy();
            delete this.auras[`${owner}:${style}`];
          }
        }
        continue;
      }

      if (!av) {
        av = new PlasmaAvatar(scene, this.col(owner), owner);
        if (owner === 'player') this.playerAvatar = av; else this.npcAvatar = av;
      }

      const aim = owner === 'player'
        ? Math.atan2(this.lastAimY - player.y, this.lastAimX - player.x)
        : Math.atan2(player.y - npc.y, player.x - npc.x);
      const pure = this.plasmaPureChaos.find((c) => c.owner === owner);
      const winding = owner === 'player' && this.plasmaRHolding;
      av.setFacing(aim);
      av.setIntensity(pure ? 1.5 : 1);
      av.setMastered(owner === 'player' ? this.arena.masteryActive : this.arena.npcMasteryActive);
      // Single owner of setHold: the R wind-up cups a knot of lightning between the hands.
      av.setHold(winding ? 'brace' : null, aim);
      av.update(delta, f.x, f.y, f.forceInvisible ? 0 : f.alpha);

      this.syncAura(owner, 'chaos', this.plasmaChaosEffects.some((e) => e.target === owner), delta, 1, aim, 24);
      this.syncAura(owner, 'pure', !!pure, delta, pure ? (pure.endsAt - time) / 1000 : 0, aim, 30);
      this.syncAura(owner, 'wind', winding,
        delta, Math.min(1, (time - this.plasmaRHeldSince) / 1500), aim, 24);
    }
  }

  // ── Public do* methods (called from buildPlayerContext / buildNpcContext) ──

  doPlasmaBurst(tx: number, ty: number, owner: 'player' | 'npc'): void {
    const caster = owner === 'player' ? this.arena.player : this.arena.npc;
    const now = this.arena.scene.time ? this.arena.scene.time.now : 0;

    // Arc a chain of lightning from the caster to the cursor to sell the attack.
    this.doPlasmaChainLightning(caster.x, caster.y, tx, ty);
    this.avatar(owner)?.play('punch', Math.atan2(ty - caster.y, tx - caster.x));

    // Three small AoEs land at the cursor, 0.2s apart.
    for (let i = 0; i < 3; i++) {
      this.plasmaClickBlasts.push({ x: tx, y: ty, owner, fireAt: now + i * 200 });
    }
    this.arena.showFloatingText(caster.x, caster.y - 36, '⚡ Plasma Burst', '#dd66ff');
  }

  /** One staggered Plasma Burst AoE: 4 dmg to enemies at the cursor, else a red bolt back. */
  private doPlasmaClickBlast(tx: number, ty: number, owner: 'player' | 'npc'): void {
    const caster = owner === 'player' ? this.arena.player : this.arena.npc;
    const targets = owner === 'player' ? this.arena.enemies : [this.arena.player];
    const aoeRadius = 42;
    const dmg = 4;
    const fx = this.fx(owner);

    // The strike itself: a bolt down from the caster, a rosette of forks at the impact and a
    // jagged ring pushed out across the floor.
    fx.flash(tx, ty, aoeRadius * 0.45, 8, PLASMA.magenta);
    fx.discharge(tx, ty, aoeRadius, 6, PLASMA.magenta, 260, 8);
    fx.ring(tx, ty, aoeRadius * 0.3, aoeRadius, PLASMA.orchid, 280, 7, 3);
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
      const hx = target.x, hy = target.y;
      target.takeDamage(dmg);
      this.arena.spawnHitFlash(target.x, target.y, 0xdd66ff);
      fx.motes(hx, hy, 3, { speed: 150, size: 3.6, color: PLASMA.blush, depth: 9 });
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
      this.doPlasmaChainLightning(tx, ty, caster.x, caster.y, PLASMA.red);
      caster.takeDamage(2);
      this.arena.spawnHitFlash(caster.x, caster.y, 0xff2244);
      fx.discharge(caster.x, caster.y, 22, 4, PLASMA.red, 220, 9);
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
        this.plasmaArenas.splice(this.plasmaArenas.indexOf(oldest), 1);
      }
    }

    const now = scene.time ? scene.time.now : 0;
    const expiresAt = (owner === 'player' && this.arena.hasUpgrade('e')) ? Infinity : now + 30000;
    this.plasmaArenas.push({
      x: tx, y: ty, radius,
      owner,
      playerInAccum: 0,
      npcInAccum: 0,
      expiresAt,
    });
    // The floor being wired up: a ring stamped down and bolts earthing themselves round it.
    const caster = owner === 'player' ? this.arena.player : this.arena.npc;
    const fx = this.fx(owner);
    this.avatar(owner)?.play('slam', Math.atan2(ty - caster.y, tx - caster.x));
    this.doPlasmaChainLightning(caster.x, caster.y, tx, ty);
    fx.ring(tx, ty, 10, radius, PLASMA.purple, 420, 7, 4);
    fx.discharge(tx, ty, radius * 0.9, 8, PLASMA.orchid, 400, 7);
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

    // Launched: both ends flare and the current snaps taut between them.
    const fx = this.fx(owner);
    this.avatar(owner)?.play('clap', ang);
    fx.flash(ax, ay, 16, 9, PLASMA.orchid);
    fx.flash(bx, by, 16, 9, PLASMA.orchid);
    fx.bolt(ax, ay, bx, by, PLASMA.white, 9, 260, 3);

    const now = scene.time ? scene.time.now : 0;
    this.plasmaCurrentOrbs.push({
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
      this.plasmaBlades.push({
        x: caster.x, y: caster.y,
        vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed,
        owner,
        expiresAt: now + 8000,
        spawnedAt: now,
        active: true,
      });
    }
    // Drawn out of the caster: a ring of bolts thrown as many ways as there are blades.
    const fx = this.fx(owner);
    this.avatar(owner)?.play('sweep');
    fx.flash(caster.x, caster.y, 26, 9, PLASMA.pink);
    fx.discharge(caster.x, caster.y, 70, count, PLASMA.pink, 360, 8);
    fx.ring(caster.x, caster.y, 12, 60, PLASMA.blush, 340, 7, 3);
    this.arena.showFloatingText(caster.x, caster.y - 36, '🔮 Chaos Blades!', '#ff44ff');
  }

  doPlasmaPureChaos(owner: 'player' | 'npc'): void {
    const { scene } = this.arena;
    const caster = owner === 'player' ? this.arena.player : this.arena.npc;
    const now = scene.time ? scene.time.now : 0;

    // Recasting refreshes rather than stacking a second shell.
    const existing = this.plasmaPureChaos.findIndex(c => c.owner === owner);
    if (existing >= 0) this.plasmaPureChaos.splice(existing, 1);

    this.plasmaPureChaos.push({ owner, endsAt: now + 20000, volleyAccum: 0 });

    // The cage slamming shut: a white core, forks in every direction and two shockwaves.
    const fx = this.fx(owner);
    this.avatar(owner)?.play('raise', -Math.PI / 2, 900);
    fx.flash(caster.x, caster.y, 44, 10, PLASMA.blush);
    fx.discharge(caster.x, caster.y, 110, 12, PLASMA.magenta, 460, 9);
    fx.ring(caster.x, caster.y, 18, 100, PLASMA.white, 450, 9, 4);
    fx.scorch(caster.x, caster.y, 60, 3);
    scene.cameras.main.shake(280, 0.006);

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
    const color = seeker.hostile ? PLASMA.blood : PLASMA.magenta;
    const hx = target.x, hy = target.y;
    if (seeker.hostile) target.applySelfDamage(seeker.damage);
    else target.takeDamage(seeker.damage);
    this.arena.spawnHitFlash(target.x, target.y, color);

    // The bead letting go on contact — forks out of the wound, not a scaling disc.
    const fx = this.fx(seeker.owner);
    fx.flash(hx, hy, 16, 9, color);
    fx.discharge(hx, hy, 32, 5, color, 240, 9);
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

    void scene;
    this.plasmaPermanentOrbs.push({
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
    const orbOwnerFighter = orb.owner === 'player' ? this.arena.player : this.arena.npc;
    if (victim === orbOwnerFighter) victim.applySelfDamage(25);
    else victim.takeDamage(25);
    this.arena.spawnHitFlash(victim.x, victim.y, 0xaa22ff);
    this.arena.showFloatingText(victim.x, victim.y - 40, '💥 CHAOS BURST!', '#ff88ff');

    // Player-sized orb, player-sized detonation.
    this.fx(orb.owner).boom(orb.x, orb.y, orb.radius * 3.4, {
      color: PLASMA.blush, bolts: 10, motes: 12,
    });
    this.arena.scene.cameras.main.shake(200, 0.005);
    orb.active = false;
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
    if (!this.stormGfx || !this.stormGfx.active) this.stormGfx = this.arena.scene.add.graphics().setDepth(1);
    this.stormGfx.clear();
    PlasmaFx.drawStorm(this.stormGfx, this.pcol, this.arena.width, this.arena.height, bounds, this.vizT);

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

    this.doPlasmaChainLightning(fromX, fromY, victim.x, victim.y, PLASMA.hot);
    // The storm wall is a stage hazard with no allegiance — it strikes a co-op
    // player through their friendly-fire block, same as it does solo.
    Fighter.asNonAllyDamage(() => victim.takeDamage(STORM_STRIKE_DAMAGE));
    this.arena.spawnHitFlash(victim.x, victim.y, 0xff2f8f);
    // The wall earthing itself through whoever touched it.
    this.pfx.discharge(victim.x, victim.y, 30, 5, PLASMA.hot, 260, 9);
    this.pfx.ring(victim.x, victim.y, 10, 34, PLASMA.rose, 260, 8, 2);
    this.arena.showFloatingText(victim.x, victim.y - 34, '⚡ STORM WALL', '#ff88cc');
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
    const caster = owner === 'player' ? this.arena.player : this.arena.npc;
    this.orbitals.push({
      owner,
      angle: Math.random() * Math.PI * 2,
      radius: ORBITAL_START_RADIUS,
      x: caster.x + ORBITAL_START_RADIUS,
      y: caster.y,
      lastHit: new Map<Fighter, number>(),
    });

    // Struck into orbit: bolts fired out to the ring it will ride, then hauled inward.
    const fx = this.fx(owner);
    this.avatar(owner)?.play('flex');
    fx.charge(caster.x, caster.y, ORBITAL_START_RADIUS, 480, ORBITAL_COLOR, 9);
    fx.flash(caster.x, caster.y, 30, 10, ORBITAL_COLOR);
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

      // Collapse: it finally reaches the caster.
      if (orb.radius <= ORBITAL_COLLAPSE_RADIUS) {
        this.doOrbitalCollapse(orb, caster);
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
        this.fx(orb.owner).discharge(f.x, f.y, 34, 5, ORBITAL_COLOR, 260, 9);
      }
    }
  }

  private doOrbitalCollapse(orb: PlasmaOrbital, caster: Fighter): void {
    // Online: the remote player's own sim detonates their orbital on them.
    if (!(orb.owner === 'npc' && caster.netGhost)) {
      caster.applySelfDamage(ORBITAL_SELF_DAMAGE);
      this.arena.spawnHitFlash(caster.x, caster.y, ORBITAL_COLOR);
    }
    this.arena.showFloatingText(caster.x, caster.y - 44, '⚛️ ORBITAL COLLAPSE!', '#ff2f8f');

    // The whole orbit dumping into the nucleus at once.
    this.fx(orb.owner).boom(caster.x, caster.y, 96, { color: ORBITAL_COLOR, bolts: 12, motes: 14 });
    this.arena.scene.cameras.main.shake(260, 0.006);
  }

  // ── Private helpers ───────────────────────────────────────────────

  private doPlasmaApplyChaos(target: 'player' | 'npc', durationMs = 15000): void {
    const { scene } = this.arena;
    const now = scene.time ? scene.time.now : 0;
    const existing = this.plasmaChaosEffects.findIndex(e => e.target === target);
    if (existing >= 0) this.plasmaChaosEffects.splice(existing, 1);
    const fighter = target === 'player' ? this.arena.player : this.arena.npc;
    this.plasmaChaosEffects.push({ target, expiresAt: now + durationMs, tickAccum: 0 });
    // The snap on application. The continuous tell is the chaos aura, so the status stays
    // readable on the victim between its 5s releases.
    this.pfx.discharge(fighter.x, fighter.y, 28, 5, PLASMA.pink, 300, 8);
    this.arena.showFloatingText(fighter.x, fighter.y - 36, durationMs < 5000 ? '🌀 Mini-Chaos!' : '🌀 CHAOS', '#ff44ff');
  }

  private doPlasmaSpawnChaosOrbs(x: number, y: number, owner: 'player' | 'npc'): void {
    for (let i = 0; i < 5; i++) {
      const ang = (i / 5) * Math.PI * 2;
      const speed = 80 + Math.random() * 60;
      this.plasmaChaosOrbs.push({
        x: x + Math.cos(ang) * 20,
        y: y + Math.sin(ang) * 20,
        vx: Math.cos(ang) * speed,
        vy: Math.sin(ang) * speed,
        owner,
        active: true,
      });
    }
    this.fx(owner).ring(x, y, 8, 40, PLASMA.blush, 300, 7, 2);
  }

  private doPlasmaChainLightning(fromX: number, fromY: number, toX: number, toY: number, color: number = PLASMA.magenta): void {
    // A live bolt: it re-rolls its own kinks every frame it exists, rather than being one
    // static polyline faded out by a tween.
    this.pfx.bolt(fromX, fromY, toX, toY, color, 8, 220, 3);
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

    const now = scene.time ? scene.time.now : 0;
    const expiresAt = now + 10000;
    const voltA: PlasmaVoltPoint = { x: ax, y: ay, owner, charges: 3, expiresAt, paired: { x: bx, y: by } };
    const voltB: PlasmaVoltPoint = { x: bx, y: by, owner, charges: 3, expiresAt, paired: { x: ax, y: ay } };
    voltA.pairedRef = voltB;
    voltB.pairedRef = voltA;
    this.plasmaVoltPoints.push(voltA, voltB);
    // Both sockets earth themselves as they're planted, and the pair links up once.
    const fx = this.fx(owner);
    this.avatar(owner)?.play('clap', ang);
    fx.flash(ax, ay, 20, 9, PLASMA.magenta);
    fx.flash(bx, by, 20, 9, PLASMA.magenta);
    fx.bolt(ax, ay, bx, by, PLASMA.white, 8, 300, 2.4);
    this.arena.showFloatingText(caster.x, caster.y - 40, '⚡ VOLT POINTS!', '#dd66ff');
  }

  private doPlasmaCurrentExplode(orb: PlasmaCurrentOrb): void {
    const cx = (orb.ax + orb.bx) / 2;
    const cy = (orb.ay + orb.by) / 2;
    const radius = 70;

    // The whole current collapsing into its own midpoint.
    this.fx(orb.owner).boom(cx, cy, radius, { color: PLASMA.orchid, bolts: 9, motes: 8 });

    const player = this.arena.player;
    const npc = this.arena.npc;
    const playerDist = Phaser.Math.Distance.Between(cx, cy, player.x, player.y);
    if (playerDist <= radius) {
      // Our own current still burns us in co-op; the ally's is friendly fire and is blocked.
      if (orb.owner === 'player') Fighter.asNonAllyDamage(() => player.takeDamage(10, { selfInflicted: true }));
      else player.takeDamage(10);
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
    const radius = arena.radius + 20;
    // 80 damage deserves the full six layers, plus a shake to match.
    this.fx(arena.owner).boom(arena.x, arena.y, radius, {
      color: PLASMA.purple, bolts: 14, motes: 16, duration: 520,
    });
    this.arena.scene.cameras.main.shake(300, 0.008);

    const player = this.arena.player;
    const npc = this.arena.npc;
    const pDist = Phaser.Math.Distance.Between(arena.x, arena.y, player.x, player.y);
    if (pDist <= radius) {
      // Our own collapsing floor still hits us in co-op; the ally's is blocked.
      if (arena.owner === 'player') Fighter.asNonAllyDamage(() => player.takeDamage(80, { selfInflicted: true }));
      else player.takeDamage(80);
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
    this.fx(owner).boom(cx, cy, 60, { color: PLASMA.orchid, bolts: 8, motes: 8 });
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
    this.solarPuddles.push({ x, y, expiresAt: this.arena.scene.time.now + 1000, tickAccum: 0, owner });
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
