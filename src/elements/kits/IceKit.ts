import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';
import { CastContext } from '../Ability';
import { Projectile } from '../../combat/Projectile';
import { meterStep } from '../../combat/Meters';
import {
  FROST_TONES, ICE, IceArmor, IceAvatar, IceColorFn, IceFx, iceShard, tonesFor,
} from './IceVisuals';

/**
 * Every ice ability — the player's and the NPC's alike — is cast through the `do*` methods
 * below, so each one drives its own arm gesture right where it fires. That covers the local
 * player, the AI opponent and an online peer's replayed casts from one place, which is why
 * this kit has no separate npc-cast-id gesture table.
 */

// ── Ice type definitions ────────────────────────────────────────────────────

export interface IcyTrail {
  /** Redrawn every frame — a fractured plate with glints crawling across it. */
  gfx: Phaser.GameObjects.Graphics;
  expiresAt: number;
  spawnAt: number;
  /** Per-patch offset so a field of trails never fractures to the same pattern. */
  seed: number;
  x: number;
  y: number;
  radius: number;
  frostTickAccum: number;
  owner: 'player' | 'npc';
  isVoid: boolean;
  rink?: boolean;
  skater?: boolean;
}

export interface IceArenaZone {
  gfx: Phaser.GameObjects.Graphics;
  seed: number;
  spawnAt: number;
  x: number; y: number; radius: number;
  expiresAt: number; tickAccum: number;
  isVoid: boolean; owner: 'player' | 'npc';
}

/** Ice Mastery — Icicle Impale: a live icicle tracking damage taken by its host toward the shatter threshold. */
interface IceIcicle {
  target: Fighter;
  sprite: Phaser.GameObjects.Graphics;
  lastHp: number;
  damageTaken: number;
  isVoid: boolean;
}

/**
 * Snow perk — a turret packed out of snow where Frozen Solid used to freeze. It holds no
 * ammunition of its own: every frost stack shot into it is one round it can throw back.
 */
interface SnowTurret {
  gfx: Phaser.GameObjects.Graphics;
  x: number; y: number;
  ammo: number;
  /** Where the barrel is pointing, eased toward whatever it is tracking. */
  aim: number;
  t: number;
  nextFireAt: number;
  expiresAt: number;
  owner: 'player' | 'npc';
  ammoLabel: Phaser.GameObjects.Text | null;
}

/** One round in flight from a snow turret. */
interface Snowball {
  gfx: Phaser.GameObjects.Graphics;
  x: number; y: number;
  vx: number; vy: number;
  t: number;
  expiresAt: number;
  owner: 'player' | 'npc';
}

/**
 * Ice Mastery — Curling Stone: a slab parked on the floor that its owner shoves around by
 * shooting it. Every shot freezes another layer onto it, and the frost is what makes it
 * dangerous: more stacks means a longer, faster slide and a heavier hit.
 */
interface CurlingStone {
  gfx: Phaser.GameObjects.Graphics;
  x: number; y: number;
  vx: number; vy: number;
  /** Accumulated roll, so the handle and rime crust turn as it travels. */
  spin: number;
  stacks: number;
  isVoid: boolean;
  owner: 'player' | 'npc';
  expiresAt: number;
  /** Per-target gate, so one pass through a crowd can't hit the same fighter twice. */
  hitCooldowns: Map<Fighter, number>;
  /** Shots that already shoved this stone — a piercing spike passes through but only counts once. */
  shoved: WeakSet<Phaser.GameObjects.GameObject>;
  chipAccum: number;
}

const ICICLE_IMPALE_COOLDOWN_MS = 6000;
const ICICLE_DASH_SPEED = 900;
const ICICLE_DASH_DURATION_MS = 150;
const ICICLE_HIT_RADIUS = 34;
const ICICLE_SHATTER_DAMAGE_THRESHOLD = 50;
const ICICLE_EXTENDED_STACK_MS = 10000;
const ICICLE_STACK_HARD_CAP = 7;
const BIG_HIT_THRESHOLD = 50;

// ── Snow perk (divine) ───────────────────────────────────────────────────────
const SNOW_TURRET_MS = 30000;
const SNOW_FIRE_INTERVAL_MS = 5000;
const SNOW_TURRET_RANGE = 460;
const SNOW_FEED_RADIUS = 30;
const SNOW_AMMO_MAX = 5;
const SNOW_BALL_SPEED = 460;
const SNOW_BALL_HIT_RADIUS = 24;
const SNOW_BALL_DAMAGE = 15;
const SNOW_SLOW_MULT = 0.5;
const SNOW_SLOW_MS = 3000;

const CURLING_COOLDOWN_MS = 25000;
const CURLING_LIFETIME_MS = 20000;
/** Half-width of the slab, used for wall bounces and for catching shots. */
const CURLING_RADIUS = 18;
const CURLING_HIT_RADIUS = 32;
const CURLING_HIT_COOLDOWN_MS = 1000;
const CURLING_BASE_DAMAGE = 30;
const CURLING_DAMAGE_PER_STACK = 0.2;
const CURLING_MAX_STACKS = 5;
/** Velocity one shot adds. Deliberately small — an unfrosted stone barely budges. */
const CURLING_BASE_PUSH = 150;
const CURLING_PUSH_PER_STACK = 62;
/** Speed below which the stone counts as parked (no damage, no chips). */
const CURLING_MOVING_SPEED = 26;
/** A Skate trail is frictionless glass — the stone screams across it. */
const CURLING_SKATE_SPEED_MULT = 3.2;
const CURLING_SKATE_DRAG = 0.4;

// ── IceArenaApi ──────────────────────────────────────────────────────────────

export interface IceArenaApi {
  readonly player: Fighter;
  readonly npc: Fighter;
  readonly enemies: Fighter[];
  readonly scene: Phaser.Scene;
  readonly projectiles: Phaser.Physics.Arcade.Group;
  readonly eKey: Phaser.Input.Keyboard.Key;
  readonly fKey: Phaser.Input.Keyboard.Key;
  readonly rKey: Phaser.Input.Keyboard.Key;
  readonly qKey: Phaser.Input.Keyboard.Key;
  readonly pointerWasDown: boolean;
  readonly nukeChanneling: boolean;
  readonly isInvasion: boolean;
  hasUpgrade(slot: string): boolean;
  hasPerk(owner: 'player' | 'npc', perkId: string): boolean;
  /** Skins: maps an ice visual color through the owner's skin. */
  iceColor(owner: 'player' | 'npc', base: number): number;
  applyNpcSpeedMult(factor: number): void;
  spawnHitFlash(x: number, y: number, color: number): void;
  showFloatingText(x: number, y: number, text: string, color: string): void;
  buildPlayerContext(x: number, y: number): CastContext;
  pointToSegmentDist(px: number, py: number, ax: number, ay: number, bx: number, by: number): number;
  /** True only when the player is ice AND Ice Mastery is switched on. */
  get masteryActive(): boolean;
  /** Mastery enhancement id bound over the given ability slot, or null if that slot is unchanged. */
  masteryBindFor(slot: string): string | null;
  recordMasteryStat(key: string, amount: number): void;
}

// ── IceKit ───────────────────────────────────────────────────────────────────

export class IceKit {
  // ── Visuals ───────────────────────────────────────────────────────────
  /** Colour mappers + effect painters, one per owner so a skin recolours one side. */
  private readonly pcol: IceColorFn;
  private readonly ncol: IceColorFn;
  private readonly pfx: IceFx;
  private readonly nfx: IceFx;
  /** The ice character rig (ball arms, eyes, shard crown) for each ice-element fighter. */
  private playerAvatar: IceAvatar | null = null;
  private npcAvatar: IceAvatar | null = null;
  /** Last aim point, cached in handleInput so the per-frame avatar update can face it. */
  private aimX = 0;
  private aimY = 0;
  private projTrailAccum = 0;
  /** Ice Mastery — Viral Frost: an always-on rime shell while mastery is enabled. */
  private masteryArmor: IceArmor | null = null;
  /** One casing per frozen fighter, rebuilt lazily and torn down when they thaw. */
  private frozenShells = new Map<Fighter, Phaser.GameObjects.Graphics>();

  // ── Player state — frost stacks ─────────────────────────────────────────
  private playerFrostStacks = 0;
  /** Expiry timestamps (Date.now()-based) for each individual frost stack — oldest first. */
  private playerFrostStackTimers: number[] = [];
  private playerFrostVisual: Phaser.GameObjects.Text | null = null;
  private playerPermafrostVisual: Phaser.GameObjects.Text | null = null;
  private playerPermavoidVisual: Phaser.GameObjects.Text | null = null;

  // ── Player state — Block Up / Black Ice ─────────────────────────────────
  private playerBlockUpActive = false;
  private playerBlockUpArmor: IceArmor | null = null;
  private playerFrozenUntil = 0;
  private playerBlackIceMorphActive = false;
  private playerBlackIceArmor: IceArmor | null = null;
  private playerIceSpeedBoostUntil = 0;
  private playerSlushLastTick = 0;

  // ── Player state — Skater mode (Ice F revamp) ───────────────────────────
  private playerSkaterActive = false;
  private playerSkaterHeading = 0;
  private playerSkaterTrailAccum = 0;
  private readonly playerSkaterSpeed = 220;
  private readonly playerSkaterTurnRate = 3.0;

  // ── Rink perk: timestamp until which the skate speed bonus applies ─────
  private playerSkateRecentUntil = 0;
  private npcSkateRecentUntil = 0;

  // ── NPC state ─────────────────────────────────────────────────────────
  private npcBlockUpActive = false;
  private npcBlockUpArmor: IceArmor | null = null;

  // ── Shared ────────────────────────────────────────────────────────────
  private icyTrails: IcyTrail[] = [];
  private iceArenas: IceArenaZone[] = [];

  // ── Ice Mastery — Viral Frost passive ───────────────────────────────
  private viralFrostCooldowns: Map<Fighter, number> = new Map();

  // ── Ice Mastery — Icicle Impale ─────────────────────────────────────
  private icicleImpales: IceIcicle[] = [];
  private icicleImpaleLastCastAt = -999999;
  private icicleDashActive = false;
  private icicleDashUntil = 0;
  private icicleDashVx = 0;
  private icicleDashVy = 0;
  private icicleDashHitThisDash = false;
  // Online mirror: the opponent's Icicle Impale dash replayed on this victim sim. We can't
  // drive the dead-reckoned npc's velocity, so we just watch for it to reach us and impale.
  private npcIcicleDashActive = false;
  private npcIcicleDashUntil = 0;
  private npcIcicleDashHit = false;

  // ── Ice Mastery — Curling Stone ─────────────────────────────────────
  /** At most one stone per owner; the npc entry only exists for an online peer's cast. */
  private curlingStones: CurlingStone[] = [];
  private curlingLastCastAt = -999999;

  // ── Snow perk — turrets, their rounds, and who they have slowed ─────
  private snowTurrets: SnowTurret[] = [];
  private snowballs: Snowball[] = [];
  private snowSlowUntil = new Map<Fighter, number>();

  constructor(private arena: IceArenaApi) {
    this.pcol = (base) => arena.iceColor('player', base);
    this.ncol = (base) => arena.iceColor('npc', base);
    this.pfx = new IceFx(arena.scene, this.pcol);
    this.nfx = new IceFx(arena.scene, this.ncol);
  }

  /** Colour mapper for a side. */
  private col(owner: 'player' | 'npc'): IceColorFn { return owner === 'player' ? this.pcol : this.ncol; }
  /** Effect painter for a side. */
  private fx(owner: 'player' | 'npc'): IceFx { return owner === 'player' ? this.pfx : this.nfx; }

  // ── Public accessors ──────────────────────────────────────────────────

  getPlayerFrostStacks(): number { return this.playerFrostStacks; }
  isPlayerBlockUpActive(): boolean { return this.playerBlockUpActive; }
  isNpcBlockUpActive(): boolean { return this.npcBlockUpActive; }
  isPlayerBlackIceMorphActive(): boolean { return this.playerBlackIceMorphActive; }
  getPlayerFrozenUntil(): number { return this.playerFrozenUntil; }
  setPlayerFrozenUntil(v: number): void { this.playerFrozenUntil = v; }
  isPlayerSkaterActive(): boolean { return this.playerSkaterActive; }
  getPlayerSkaterHeading(): number { return this.playerSkaterHeading; }
  getPlayerSkaterSpeed(): number { return this.playerSkaterSpeed; }

  /** 0 = just cast, 1 = ready. Drives the HUD bar when Icicle Impale is bound to a slot. */
  getIcicleImpaleCooldownRatio(time: number): number {
    return Math.min(1, (time - this.icicleImpaleLastCastAt) / ICICLE_IMPALE_COOLDOWN_MS);
  }

  /** 0 = just cast, 1 = ready. Drives the HUD bar when Curling Stone is bound to a slot. */
  getCurlingStoneCooldownRatio(time: number): number {
    return Math.min(1, (time - this.curlingLastCastAt) / CURLING_COOLDOWN_MS);
  }

  /** Combined multiplier contribution (frost/permafrost slow, block-up slow, own-trail boost, Rink perk) for the NPC. */
  getNpcSpeedMultContribution(time: number): number {
    const npc = this.arena.npc;
    let mult = 1;
    if (npc.frostStacks > 0) mult *= (1 - npc.frostStacks * 0.1);
    if (npc.permafrostStacks > 0) mult *= (1 - npc.permafrostStacks * 0.10);
    if (this.npcBlockUpActive) mult *= 0.5;
    if (this.arena.hasPerk('npc', 'rink') && this.icyTrails.some((t) => t.owner === 'npc' && Phaser.Math.Distance.Between(npc.x, npc.y, t.x, t.y) <= t.radius)) {
      mult *= 1.25;
      if (this.npcSkateRecentUntil > time) mult *= 1.25;
    }
    return mult;
  }

  /** Combined multiplier contribution (frost/permafrost slow, block-up slow, skate-trail boost, Rink perk) for the player. */
  getPlayerSpeedMultContribution(time: number, isPlayerIce: boolean): number {
    const player = this.arena.player;
    let mult = 1;
    if (this.playerFrostStacks > 0) mult *= (1 - this.playerFrostStacks * 0.1);
    if (player.permafrostStacks > 0) mult *= (1 - player.permafrostStacks * 0.10);
    if (this.playerBlockUpActive) mult *= 0.5;
    if (isPlayerIce && this.playerIceSpeedBoostUntil > time) mult *= 1.2;
    if (this.arena.hasPerk('player', 'rink') && this.icyTrails.some((t) => t.owner === 'player' && Phaser.Math.Distance.Between(player.x, player.y, t.x, t.y) <= t.radius)) {
      mult *= 1.25;
      if (this.playerSkateRecentUntil > time) mult *= 1.25;
    }
    return mult;
  }

  reset(): void {
    // Visuals — every GameObject dies with the old scene run, so rebuild lazily in update().
    if (this.playerAvatar) { this.playerAvatar.destroy(); this.playerAvatar = null; }
    if (this.npcAvatar) { this.npcAvatar.destroy(); this.npcAvatar = null; }
    if (this.masteryArmor) { this.masteryArmor.destroy(); this.masteryArmor = null; }
    for (const g of this.frozenShells.values()) g.destroy();
    this.frozenShells.clear();
    this.aimX = 0;
    this.aimY = 0;
    this.projTrailAccum = 0;

    this.playerFrostStacks = 0;
    this.playerFrostStackTimers = [];
    if (this.playerFrostVisual) { this.playerFrostVisual.destroy(); this.playerFrostVisual = null; }
    if (this.playerPermafrostVisual) { this.playerPermafrostVisual.destroy(); this.playerPermafrostVisual = null; }
    if (this.playerPermavoidVisual) { this.playerPermavoidVisual.destroy(); this.playerPermavoidVisual = null; }
    this.playerBlockUpActive = false;
    if (this.playerBlockUpArmor) { this.playerBlockUpArmor.destroy(); this.playerBlockUpArmor = null; }
    this.playerFrozenUntil = 0;
    this.npcBlockUpActive = false;
    if (this.npcBlockUpArmor) { this.npcBlockUpArmor.destroy(); this.npcBlockUpArmor = null; }
    this.icyTrails.forEach((t) => t.gfx.destroy());
    this.icyTrails = [];
    this.playerBlackIceMorphActive = false;
    if (this.playerBlackIceArmor) { this.playerBlackIceArmor.destroy(); this.playerBlackIceArmor = null; }
    this.playerIceSpeedBoostUntil = 0;
    this.playerSlushLastTick = 0;
    this.playerSkateRecentUntil = 0;
    this.npcSkateRecentUntil = 0;
    this.playerSkaterActive = false;
    this.playerSkaterHeading = 0;
    this.playerSkaterTrailAccum = 0;
    this.iceArenas.forEach((a) => a.gfx.destroy());
    this.iceArenas = [];
    this.viralFrostCooldowns.clear();
    this.icicleImpales.forEach((ic) => ic.sprite.destroy());
    this.icicleImpales = [];
    this.icicleImpaleLastCastAt = -999999;
    this.npcIcicleDashActive = false;
    this.npcIcicleDashUntil = 0;
    this.npcIcicleDashHit = false;
    this.icicleDashActive = false;
    this.icicleDashUntil = 0;
    this.icicleDashVx = 0;
    this.icicleDashVy = 0;
    this.icicleDashHitThisDash = false;
    this.curlingStones.forEach((s) => s.gfx.destroy());
    this.curlingStones = [];
    this.curlingLastCastAt = -999999;
    this.snowTurrets.forEach((t) => { t.gfx.destroy(); t.ammoLabel?.destroy(); });
    this.snowTurrets = [];
    this.snowballs.forEach((b) => b.gfx.destroy());
    this.snowballs = [];
    for (const f of this.snowSlowUntil.keys()) if (f.active) f.walkSpeedMult = 1;
    this.snowSlowUntil.clear();
  }

  // ── Per-frame update (called when either side is playing Ice) ─────────

  update(time: number, delta: number, isPlayerIce: boolean, isNpcIce = false): void {
    const { player, npc, enemies, scene } = this.arena;

    this.updateAvatars(delta, isPlayerIce, isNpcIce);
    this.updateSpikeTrails(delta);
    this.updateFrozenShells(time);
    // Owner-agnostic, so an online peer's stone rolls on this sim too.
    this.updateCurlingStones(time, delta);
    this.updateSnowTurrets(time, delta);

    // Icy trail ticks: slow enemy + inflict frost/void-frost stacks + F+ owner speed boost
    for (let ti = this.icyTrails.length - 1; ti >= 0; ti--) {
      const trail = this.icyTrails[ti];
      if (time >= trail.expiresAt) {
        trail.gfx.destroy();
        this.icyTrails.splice(ti, 1);
        continue;
      }
      // The plate keeps growing for its first frames and thins out over its last second.
      // Rink tiles are seeded with a future spawnAt so the sheet freezes outward, hence the
      // clamp at the bottom end as well.
      const grow = Phaser.Math.Clamp((time - trail.spawnAt) / 220, 0, 1);
      const left = trail.expiresAt - time;
      trail.gfx.clear();
      IceFx.drawRink(
        trail.gfx, this.col(trail.owner), tonesFor(trail.isVoid),
        trail.x, trail.y, trail.radius * (0.55 + grow * 0.45),
        time / 1000, left < 1000 ? Math.max(0, left / 1000) : 1, trail.seed,
      );
      // Slow enemies standing in the trail
      if (trail.owner === 'player') {
        const enemiesInTrail: Fighter[] = [];
        for (const enemyTarget of enemies) {
          if (!enemyTarget.active || enemyTarget.hp <= 0) continue;
          if (Phaser.Math.Distance.Between(trail.x, trail.y, enemyTarget.x, enemyTarget.y) <= trail.radius) {
            // Slow via physics body (works for both PvP npc and invasion enemies)
            if (!this.playerBlackIceMorphActive) {
              const eb = enemyTarget.body as Phaser.Physics.Arcade.Body;
              eb.velocity.x *= 0.8; eb.velocity.y *= 0.8;
            }
            // Also update npcSpeedMult for PvP NPC
            if (!this.arena.isInvasion && !this.playerBlackIceMorphActive) this.arena.applyNpcSpeedMult(0.8);
            enemiesInTrail.push(enemyTarget);
          }
        }
        // Tick frost accumulator once per trail, then apply stacks to all enemies in it
        const trailInterval = trail.skater ? 2000 : 1200;
        if (enemiesInTrail.length > 0) {
          trail.frostTickAccum += delta;
          if (trail.frostTickAccum >= trailInterval) {
            trail.frostTickAccum -= trailInterval;
            for (const enemyTarget of enemiesInTrail) this.addFrostStackTo(enemyTarget);
          }
        }
      } else {
        if (Phaser.Math.Distance.Between(trail.x, trail.y, player.x, player.y) <= trail.radius) {
          // Player slow — movement already applied, directly scale current velocity
          const trailPlayerBody = player.body as Phaser.Physics.Arcade.Body;
          trailPlayerBody.velocity.x *= 0.8;
          trailPlayerBody.velocity.y *= 0.8;
          trail.frostTickAccum += delta;
          if (trail.frostTickAccum >= 1200) {
            trail.frostTickAccum -= 1200;
            this.addFrostStack('player');
          }
        }
      }
      // F+: stepping on own trail grants speed boost
      if (this.arena.hasUpgrade('f') && trail.owner === 'player') {
        const ownerDist = Phaser.Math.Distance.Between(trail.x, trail.y, player.x, player.y);
        if (ownerDist <= trail.radius) {
          this.playerIceSpeedBoostUntil = Math.max(this.playerIceSpeedBoostUntil, time + 3000);
        }
      }
      // Rink perk: slippery physics — both fighters slide (low friction) on rink tiles
      if (trail.rink) {
        const playerOnRink = Phaser.Math.Distance.Between(trail.x, trail.y, player.x, player.y) <= trail.radius;
        const npcOnRink    = Phaser.Math.Distance.Between(trail.x, trail.y, npc.x, npc.y) <= trail.radius;
        if (playerOnRink) {
          const pb = player.body as Phaser.Physics.Arcade.Body;
          pb.velocity.x *= 0.985; pb.velocity.y *= 0.985;
        }
        if (npcOnRink) {
          const nb = npc.body as Phaser.Physics.Arcade.Body;
          nb.velocity.x *= 0.985; nb.velocity.y *= 0.985;
        }
      }
    }

    // Skater per-frame heading update (Ice F revamp)
    if (isPlayerIce && this.playerSkaterActive) {
      const ptr = scene.input.activePointer;
      const desired = Math.atan2(ptr.worldY - player.y, ptr.worldX - player.x);
      const diff = Phaser.Math.Angle.Wrap(desired - this.playerSkaterHeading);
      const maxTurn = this.playerSkaterTurnRate * (delta / 1000);
      this.playerSkaterHeading += Phaser.Math.Clamp(diff, -maxTurn, maxTurn);
      // Arms thrown out wide for balance while the ice carries them.
      this.playerAvatar?.setHold('ride', this.playerSkaterHeading);
      this.playerSkaterTrailAccum += delta;
      if (this.playerSkaterTrailAccum >= 80) {
        this.playerSkaterTrailAccum -= 80;
        this.spawnIcyTrail(player.x, player.y, 'player', { skater: true });
      }
    }

    // ── Ice Mastery ──────────────────────────────────────────────────
    if (isPlayerIce) {
      // Viral Frost passive: frost/void stacks spread between enemies on contact
      if (this.arena.masteryActive) {
        const vfNow = Date.now();
        for (const source of enemies) {
          if (!source.active || source.hp <= 0) continue;
          const sourceHasVoid = source.voidFrostStacks > 0;
          if (!sourceHasVoid && source.frostStacks === 0) continue;
          for (const victim of enemies) {
            if (victim === source || !victim.active || victim.hp <= 0) continue;
            if (vfNow < (this.viralFrostCooldowns.get(victim) ?? 0)) continue;
            if (Phaser.Math.Distance.Between(source.x, source.y, victim.x, victim.y) > 40) continue;
            this.viralFrostCooldowns.set(victim, vfNow + 1000);
            this.addFrostStackTo(victim, sourceHasVoid);
          }
        }
      }

      // Icicle Impale: dash movement + on-hit impale
      if (this.icicleDashActive) {
        const dashBody = player.body as Phaser.Physics.Arcade.Body;
        if (time >= this.icicleDashUntil) {
          this.icicleDashActive = false;
          dashBody.setVelocity(0, 0);
        } else {
          dashBody.setVelocity(this.icicleDashVx, this.icicleDashVy);
          if (!this.icicleDashHitThisDash) {
            for (const t of enemies) {
              if (!t.active || t.hp <= 0) continue;
              if (Phaser.Math.Distance.Between(player.x, player.y, t.x, t.y) <= ICICLE_HIT_RADIUS) {
                this.icicleDashHitThisDash = true;
                this.impaleTarget(t);
                break;
              }
            }
          }
        }
      }

      // Icicle Impale: live icicles track damage taken by their host, then shatter at threshold
      this.tickIcicleImpales();
    }

    // Ice arena ticks (Skate-in-BlockUp / Skate-in-BlackIce)
    for (let ai = this.iceArenas.length - 1; ai >= 0; ai--) {
      const arenaZone = this.iceArenas[ai];
      if (time >= arenaZone.expiresAt) {
        arenaZone.gfx.destroy();
        this.iceArenas.splice(ai, 1);
        continue;
      }
      const zoneGrow = Math.min(1, (time - arenaZone.spawnAt) / 300);
      const zoneLeft = arenaZone.expiresAt - time;
      arenaZone.gfx.clear();
      IceFx.drawRink(
        arenaZone.gfx, this.col(arenaZone.owner), tonesFor(arenaZone.isVoid),
        arenaZone.x, arenaZone.y, arenaZone.radius * (0.4 + zoneGrow * 0.6),
        time / 1000, zoneLeft < 900 ? Math.max(0, zoneLeft / 900) : 1, arenaZone.seed,
      );
      arenaZone.tickAccum += delta;
      if (arenaZone.tickAccum >= 2000) {
        arenaZone.tickAccum -= 2000;
        const arenaTargets = arenaZone.owner === 'player' ? (enemies as Fighter[]) : [player as Fighter];
        for (const t of arenaTargets) {
          if (!t.active || t.hp <= 0) continue;
          if (Phaser.Math.Distance.Between(arenaZone.x, arenaZone.y, t.x, t.y) > arenaZone.radius) continue;
          if (arenaZone.isVoid) {
            if (Date.now() >= t.voidImmuneUntil) {
              t.voidFrostStacks = Math.max(t.voidFrostStacks, Math.min(5, t.voidFrostStacks + 1));
              t.incomingDamageMultiplier = this.frostDamageMultiplier(t.voidFrostStacks);
            }
          } else {
            if (Date.now() >= t.frostImmuneUntil) {
              if (t.frostStacks < 5) t.frostStackTimers.push(Date.now() + (this.isImpaled(t) ? ICICLE_EXTENDED_STACK_MS : 8000));
              t.frostStacks = Math.max(t.frostStacks, Math.min(5, t.frostStacks + 1));
              t.incomingDamageMultiplier = this.frostDamageMultiplier(t.frostStacks);
            }
          }
        }
      }
    }

    // Void frost DOT (black ice morph) — 1 dmg/sec per stack, plus any permavoid bonus
    for (const t of enemies) {
      if (!t.active || t.hp <= 0 || t.voidFrostStacks === 0) continue;
      const vfDps = t.voidFrostStacks + t.permavoidStacks;
      t.voidFrostTickAccum += delta;
      if (t.voidFrostTickAccum >= 1000) {
        t.voidFrostTickAccum -= 1000;
        t.takeDamage(vfDps);
        this.arena.spawnHitFlash(t.x, t.y, ICE.voidGlow);
        // Void frost visibly eats its host between ticks, not just on the tick.
        this.pfx.shards(t.x, t.y, 2, { speed: 26, size: 2.2, life: 620, fall: 26, depth: 7, isVoid: true });
        this.arena.recordMasteryStat('voidFrostDamage', vfDps);
        this.recordBigHit(vfDps);
      }
    }

    // Frost / void-frost stack expiry — each individual stack fades 8s after being applied.
    // While frozen solid, the countdown is held: nudge timers forward by the
    // elapsed frame delta so they don't lose ground against Date.now().
    {
      const fnow = Date.now();
      if (this.playerFrostStackTimers.length > 0) {
        if (this.playerFrozenUntil > time) {
          this.playerFrostStackTimers = this.playerFrostStackTimers.map((ts) => ts + delta);
        } else {
          const before = this.playerFrostStackTimers.length;
          this.playerFrostStackTimers = this.playerFrostStackTimers.filter((ts) => ts > fnow);
          if (this.playerFrostStackTimers.length !== before) {
            this.playerFrostStacks = this.playerFrostStackTimers.length;
            const baseMult = this.frostDamageMultiplier(this.playerFrostStacks);
            player.incomingDamageMultiplier = this.playerBlackIceMorphActive
              ? baseMult * 1.25
              : this.playerBlockUpActive ? baseMult * 0.75 : baseMult;
          }
        }
      }
      for (const t of enemies) {
        if (t.frostStackTimers.length === 0) continue;
        if (t.frozenUntil > time) {
          t.frostStackTimers = t.frostStackTimers.map((ts) => ts + delta);
          continue;
        }
        const before = t.frostStackTimers.length;
        t.frostStackTimers = t.frostStackTimers.filter((ts) => ts > fnow);
        if (t.frostStackTimers.length === before) continue;
        t.frostStacks = t.frostStackTimers.length;
        const baseMult = this.frostDamageMultiplier(t.frostStacks);
        t.incomingDamageMultiplier = (t === npc && this.npcBlockUpActive) ? baseMult * 0.75 : baseMult;
      }
      for (const t of enemies) {
        if (t.voidFrostStackTimers.length === 0) continue;
        if (t.frozenUntil > time) {
          t.voidFrostStackTimers = t.voidFrostStackTimers.map((ts) => ts + delta);
          continue;
        }
        const before = t.voidFrostStackTimers.length;
        t.voidFrostStackTimers = t.voidFrostStackTimers.filter((ts) => ts > fnow);
        if (t.voidFrostStackTimers.length === before) continue;
        t.voidFrostStacks = t.voidFrostStackTimers.length;
        const baseMult = this.frostDamageMultiplier(t.voidFrostStacks);
        t.incomingDamageMultiplier = (t === npc && this.npcBlockUpActive) ? baseMult * 0.75 : baseMult;
      }
    }

    // Frost visual indicators above enemies
    for (const t of enemies) {
      if (!t.active) continue;
      const frostLabel = t.frostStacks > 0 ? `❄️×${t.frostStacks}` : '';
      if (frostLabel) {
        if (!t.frostVisual) {
          t.frostVisual = scene.add.text(t.x, t.y - 42, frostLabel,
            { fontSize: '12px', fontFamily: 'Arial', color: '#aaddff' }).setOrigin(0.5).setDepth(10);
        } else {
          t.frostVisual.setText(frostLabel).setPosition(t.x, t.y - 42);
        }
      } else if (t.frostVisual) {
        t.frostVisual.destroy(); t.frostVisual = null;
      }

      const pfLabel = t.permafrostStacks > 0 ? `🧊×${t.permafrostStacks}` : '';
      if (pfLabel) {
        if (!t.permafrostVisual) {
          t.permafrostVisual = scene.add.text(t.x, t.y - 78, pfLabel,
            { fontSize: '11px', fontFamily: 'Arial', color: '#88eeff' }).setOrigin(0.5).setDepth(10);
        } else {
          t.permafrostVisual.setText(pfLabel).setPosition(t.x, t.y - 78);
        }
      } else if (t.permafrostVisual) {
        t.permafrostVisual.destroy(); t.permafrostVisual = null;
      }

      const pvLabel = t.permavoidStacks > 0 ? `💜×${t.permavoidStacks}` : '';
      if (pvLabel) {
        if (!t.permavoidVisual) {
          t.permavoidVisual = scene.add.text(t.x, t.y - 90, pvLabel,
            { fontSize: '11px', fontFamily: 'Arial', color: '#cc44ff' }).setOrigin(0.5).setDepth(10);
        } else {
          t.permavoidVisual.setText(pvLabel).setPosition(t.x, t.y - 90);
        }
      } else if (t.permavoidVisual) {
        t.permavoidVisual.destroy(); t.permavoidVisual = null;
      }
    }

    // Void frost visual
    const vfLabel = npc.voidFrostStacks > 0 ? `☠️×${npc.voidFrostStacks}` : '';
    if (vfLabel) {
      if (!npc.voidFrostVisual) {
        npc.voidFrostVisual = scene.add.text(npc.x, npc.y - 54, vfLabel,
          { fontSize: '12px', fontFamily: 'Arial', color: '#cc88ff' }).setOrigin(0.5).setDepth(10);
      } else {
        npc.voidFrostVisual.setText(vfLabel).setPosition(npc.x, npc.y - 54);
      }
    } else if (npc.voidFrostVisual) {
      npc.voidFrostVisual.destroy(); npc.voidFrostVisual = null;
    }

    const frostPlayerLabel = this.playerFrostStacks > 0 ? `❄️×${this.playerFrostStacks}` : '';
    if (frostPlayerLabel) {
      if (!this.playerFrostVisual) {
        this.playerFrostVisual = scene.add.text(player.x, player.y - 42, frostPlayerLabel,
          { fontSize: '12px', fontFamily: 'Arial', color: '#aaddff' }).setOrigin(0.5).setDepth(10);
      } else {
        this.playerFrostVisual.setText(frostPlayerLabel).setPosition(player.x, player.y - 42);
      }
    } else if (this.playerFrostVisual) {
      this.playerFrostVisual.destroy(); this.playerFrostVisual = null;
    }

    const playerPfLabel = player.permafrostStacks > 0 ? `🧊×${player.permafrostStacks}` : '';
    if (playerPfLabel) {
      if (!this.playerPermafrostVisual) {
        this.playerPermafrostVisual = scene.add.text(player.x, player.y - 54, playerPfLabel,
          { fontSize: '11px', fontFamily: 'Arial', color: '#88eeff' }).setOrigin(0.5).setDepth(10);
      } else {
        this.playerPermafrostVisual.setText(playerPfLabel).setPosition(player.x, player.y - 54);
      }
    } else if (this.playerPermafrostVisual) {
      this.playerPermafrostVisual.destroy(); this.playerPermafrostVisual = null;
    }

    const playerPvLabel = player.permavoidStacks > 0 ? `💜×${player.permavoidStacks}` : '';
    if (playerPvLabel) {
      if (!this.playerPermavoidVisual) {
        this.playerPermavoidVisual = scene.add.text(player.x, player.y - 66, playerPvLabel,
          { fontSize: '11px', fontFamily: 'Arial', color: '#cc44ff' }).setOrigin(0.5).setDepth(10);
      } else {
        this.playerPermavoidVisual.setText(playerPvLabel).setPosition(player.x, player.y - 66);
      }
    } else if (this.playerPermavoidVisual) {
      this.playerPermavoidVisual.destroy(); this.playerPermavoidVisual = null;
    }

    // Armour shells ride their owners.
    this.playerBlockUpArmor?.update(delta, player.x, player.y, player.alpha);
    this.npcBlockUpArmor?.update(delta, npc.x, npc.y, npc.alpha);
    this.playerBlackIceArmor?.update(delta, player.x, player.y, player.alpha);

    // Frozen overlays (blue tint flash)
    if (this.playerFrozenUntil > 0 && time >= this.playerFrozenUntil) {
      this.playerFrozenUntil = 0;
    }
    if (npc.frozenUntil > 0 && time >= npc.frozenUntil) {
      npc.frozenUntil = 0;
    }
  }

  // ── Ice character rig ─────────────────────────────────────────────────

  /**
   * Builds (on first frame) and drives the ball-arm avatar for whichever fighters are ice.
   * The player faces the cursor; the NPC faces whoever it is fighting. The mastery passive's
   * rime shell lives here too, at a lower depth than the Block Up armour so the two stack into
   * one silhouette rather than fighting each other.
   */
  private updateAvatars(delta: number, isPlayerIce: boolean, isNpcIce: boolean): void {
    const { player, npc, scene } = this.arena;

    if (isPlayerIce && player?.active) {
      if (!this.playerAvatar) this.playerAvatar = new IceAvatar(scene, this.pcol);
      const aimX = this.aimX || player.x + 1;
      const aimY = this.aimY || player.y;
      this.playerAvatar.setFacing(Math.atan2(aimY - player.y, aimX - player.x));
      this.playerAvatar.setVoid(this.playerBlackIceMorphActive);
      // Skating and armouring up are the character working at full stretch.
      this.playerAvatar.setIntensity(
        this.playerSkaterActive ? 1.4 : (this.playerBlockUpActive || this.playerBlackIceMorphActive) ? 1.25 : 1,
      );
      this.playerAvatar.setMastered(this.arena.masteryActive);
      this.playerAvatar.update(delta, player.x, player.y, player.forceInvisible ? 0 : player.alpha);

      // Ice Mastery — Viral Frost: an always-on rime shell while mastery is enabled.
      if (this.arena.masteryActive) {
        if (!this.masteryArmor) this.masteryArmor = new IceArmor(scene, this.pcol, FROST_TONES, 44, 0.7, 2, 6);
        this.masteryArmor.update(delta, player.x, player.y, player.alpha);
      } else if (this.masteryArmor) {
        this.masteryArmor.destroy();
        this.masteryArmor = null;
      }
    } else if (this.playerAvatar) {
      this.playerAvatar.destroy();
      this.playerAvatar = null;
      if (this.masteryArmor) { this.masteryArmor.destroy(); this.masteryArmor = null; }
    }

    if (isNpcIce && npc?.active) {
      if (!this.npcAvatar) this.npcAvatar = new IceAvatar(scene, this.ncol);
      this.npcAvatar.setFacing(Math.atan2(player.y - npc.y, player.x - npc.x));
      this.npcAvatar.setIntensity(this.npcBlockUpActive ? 1.25 : 1);
      this.npcAvatar.update(delta, npc.x, npc.y, npc.forceInvisible ? 0 : npc.alpha);
    } else if (this.npcAvatar) {
      this.npcAvatar.destroy();
      this.npcAvatar = null;
    }
  }

  /** Every live ice spike drags a shrinking tail of frost chips behind it. */
  private updateSpikeTrails(delta: number): void {
    this.projTrailAccum += delta;
    if (this.projTrailAccum < 45) return;
    this.projTrailAccum = 0;
    for (const child of this.arena.projectiles.getChildren()) {
      const proj = child as Projectile;
      if (!proj.active || proj.texture?.key !== 'proj-ice') continue;
      const fx = proj.isFromPlayer ? this.pfx : this.nfx;
      const body = proj.body as Phaser.Physics.Arcade.Body | null;
      // Trail streams out of the back of the shot rather than puffing symmetrically.
      const back = body ? Math.atan2(-body.velocity.y, -body.velocity.x) : 0;
      fx.shards(proj.x, proj.y, 2, {
        angle: back, spread: 0.4, speed: 34, size: 2.4, life: 300, fall: 6, depth: 4,
        isVoid: proj.isFromPlayer && this.playerBlackIceMorphActive,
      });
    }
  }

  /**
   * A frozen fighter is encased in a block of ice for as long as the freeze lasts. Shells are
   * built lazily and torn down the moment their host thaws or dies, so nothing survives a
   * match restart.
   */
  private updateFrozenShells(time: number): void {
    const { player, npc, enemies, scene } = this.arena;
    const frozen = new Set<Fighter>();
    if (this.playerFrozenUntil > time && player.active) frozen.add(player);
    for (const t of [npc, ...enemies]) {
      if (t?.active && t.frozenUntil > time) frozen.add(t);
    }

    for (const f of frozen) {
      let g = this.frozenShells.get(f);
      if (!g) {
        g = scene.add.graphics().setDepth(9);
        this.frozenShells.set(f, g);
        // Snap on application: the casing slams shut around them.
        const fx = f === player ? this.nfx : this.pfx;
        fx.bloom(f.x, f.y, 34, 9, 8, f.voidFrostStacks > 0);
      }
      g.clear();
      IceFx.drawFrozenShell(
        g, f === player ? this.ncol : this.pcol,
        tonesFor(f.voidFrostStacks > 0), f.x, f.y, time / 1000, 1,
      );
    }

    for (const [f, g] of this.frozenShells) {
      if (frozen.has(f)) continue;
      g.destroy();
      this.frozenShells.delete(f);
      // Thawing breaks the casing rather than dissolving it.
      if (f.active) (f === player ? this.nfx : this.pfx).shatter(f.x, f.y, 46, { shards: 10, vapor: 1, rime: false, duration: 320 });
    }
  }

  // ── Input ────────────────────────────────────────────────────────────

  handleInput(time: number, pointer: Phaser.Input.Pointer, mouseX: number, mouseY: number): void {
    if (this.arena.nukeChanneling) return;
    const { player, fKey, eKey, rKey, qKey } = this.arena;
    const playerCtx = this.arena.buildPlayerContext(mouseX, mouseY);
    // Cached for the avatar rig, which runs in update() and has no pointer of its own.
    this.aimX = mouseX;
    this.aimY = mouseY;
    // Ice Mastery abilities may be bound over any of E/R/F/Q, suppressing that slot's base ability.
    if (Phaser.Input.Keyboard.JustDown(fKey) && !this.castMasteryBind('f', time)) {
      // While active, recast always cancels — even mid-cooldown — so bypass the
      // normal cooldown-gated castAbility() and call the cast fn directly.
      if (this.playerSkaterActive) playerCtx.startSkate();
      else player.castAbility('skate', playerCtx);
    }
    if (!this.playerSkaterActive) {
      if (Phaser.Input.Keyboard.JustDown(eKey) && !this.castMasteryBind('e', time)) {
        player.castAbility('frost-blast', playerCtx);
      }
      if (Phaser.Input.Keyboard.JustDown(rKey) && !this.castMasteryBind('r', time)) {
        player.castAbility('block-up', playerCtx);
      }
      if (Phaser.Input.Keyboard.JustDown(qKey) && !this.castMasteryBind('q', time)) {
        player.castAbility('frozen-solid', playerCtx);
      }
      if (pointer.isDown) {
        if (this.arena.hasUpgrade('click')) {
          if (!this.arena.pointerWasDown) {
            player.castAbility('ice-spike', playerCtx);
            this.playerSlushLastTick = time;
          } else if (time - this.playerSlushLastTick >= 200) {
            this.playerSlushLastTick = time;
            this.fireSlushThrower(mouseX, mouseY);
          }
        } else {
          player.castAbility('ice-spike', playerCtx);
        }
      } else if (this.arena.hasUpgrade('click') && !this.playerSkaterActive) {
        // Slush Thrower is the only thing that holds 'spray'; skating owns 'ride' instead.
        this.playerAvatar?.setHold(null);
      }
    }
  }

  // ── Projectile hit reactions ────────────────────────────────────────

  /** NPC's ice spike hit the player: frost stack + unfreeze bonus. */
  onIceSpikeHitPlayer(time: number): void {
    if (this.playerFrozenUntil > time) {
      this.playerFrozenUntil = 0;
      for (let fi = 0; fi < 3; fi++) this.addFrostStack('player');
    } else {
      this.addFrostStack('player');
    }
  }

  /** Player's ice spike hit an enemy: frost stack + unfreeze bonus. */
  onIceSpikeHitEnemy(target: Fighter, time: number): void {
    if (target.frozenUntil > time) {
      target.frozenUntil = 0;
      for (let fi = 0; fi < 3; fi++) this.addFrostStackTo(target);
    } else {
      this.addFrostStackTo(target);
    }
  }

  // ── Cast context implementations — player ──────────────────────────

  doFireIceSpike(tx: number, ty: number): void {
    const { player, scene, projectiles } = this.arena;
    const dx = tx - player.x;
    const dy = ty - player.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const angle = Math.atan2(dy, dx);
    // Arms jab first so the shot reads as coming out of a hand.
    this.playerAvatar?.play('punch', angle);
    const hand = this.playerAvatar?.castHand() ?? { x: player.x, y: player.y };
    this.pfx.muzzleFrost(hand.x, hand.y, angle, 1, 8, this.playerBlackIceMorphActive);
    const proj = new Projectile(scene, player.x, player.y, 'proj-ice', 8, true);
    if (this.playerBlackIceMorphActive) proj.setTint(ICE.voidGlow);
    projectiles.add(proj);
    proj.launch((dx / len) * 520, (dy / len) * 520);
  }

  doFireFrostBlast(tx: number, ty: number): void {
    const { player, enemies, scene } = this.arena;
    const time = scene.time.now;
    const isBlackIce = this.playerBlackIceMorphActive;
    const hasTarget = enemies.some((t) =>
      t.active && t.hp > 0 && (isBlackIce ? t.voidFrostStacks : t.frostStacks) > 0,
    );
    if (!hasTarget) return;
    const dx = tx - player.x;
    const dy = ty - player.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const angle = Math.atan2(dy / len, dx / len);
    const endX = player.x + Math.cos(angle) * 1200;
    const endY = player.y + Math.sin(angle) * 1200;
    this.playerAvatar?.play('sweep', angle);
    this.spawnFrostBeamVisual(player.x, player.y, endX, endY, isBlackIce);
    for (const t of enemies) {
      if (!t.active || t.hp <= 0) continue;
      if (isBlackIce ? t.voidFrostStacks === 0 : t.frostStacks === 0) continue;
      const d = this.arena.pointToSegmentDist(t.x, t.y, player.x, player.y, endX, endY);
      if (d > 32) continue;
      this.arena.spawnHitFlash(t.x, t.y, isBlackIce ? ICE.voidGlow : ICE.sky);
      // Stacks being spent are worth a real break, scaled by how many were on the target.
      const spent = isBlackIce ? t.voidFrostStacks : t.frostStacks;
      this.pfx.shatter(t.x, t.y, 50 + spent * 12, {
        shards: 8 + spent * 3, vapor: 1 + Math.floor(spent / 2),
        duration: 340 + spent * 40, isVoid: isBlackIce,
      });
      // 3s immunity to new frost/void stacks (permafrost/permavoid unaffected)
      t.frostImmuneUntil = Math.max(t.frostImmuneUntil, time + 3000);
      t.voidImmuneUntil  = Math.max(t.voidImmuneUntil,  time + 3000);
      if (isBlackIce) {
        // Detonate: instantly deal all the DOT damage the remaining void frost duration would have dealt.
        const fnow = Date.now();
        const detonateDamage = Math.round(
          t.voidFrostStackTimers.reduce((sum, ts) => sum + Math.max(0, ts - fnow), 0) / 1000,
        );
        t.takeDamage(detonateDamage);
        if (detonateDamage > 0) {
          this.arena.recordMasteryStat('voidFrostDamage', detonateDamage);
          this.recordBigHit(detonateDamage);
        }
        t.voidFrostStacks = 0;
        t.voidFrostStackTimers = [];
        t.incomingDamageMultiplier = (t === this.arena.npc && this.npcBlockUpActive) ? 0.75 : 1;
        const vt = scene.add.text(t.x, t.y - 30, 'DETONATED', { fontSize: '11px', color: '#cc88ff', fontFamily: 'Arial Black' }).setOrigin(0.5).setDepth(12);
        scene.tweens.add({ targets: vt, y: vt.y - 20, alpha: 0, duration: 1200, onComplete: () => vt.destroy() });
      } else {
        const targetStacks = t.frostStacks;
        if (targetStacks >= 5) this.arena.recordMasteryStat('frostBlast5StackHits', 1);
        const blastDamage = Math.round(targetStacks * 7.5);
        t.takeDamage(blastDamage);
        this.recordBigHit(blastDamage);
        // E+: keep residual frost stacks
        if (this.arena.hasUpgrade('e')) {
          const stacks = t.frostStacks;
          t.frostStacks = 0;
          t.incomingDamageMultiplier = 1;
          if (stacks >= 5) {
            t.frostStacks = 2;
            t.incomingDamageMultiplier = this.frostDamageMultiplier(2);
          } else if (stacks >= 3) {
            t.frostStacks = 1;
            t.incomingDamageMultiplier = this.frostDamageMultiplier(1);
          }
        } else {
          t.frostStacks = 0;
          t.incomingDamageMultiplier = 1;
        }
        t.frostStackTimers = t.frostStacks > 0 ? t.frostStackTimers.slice(-t.frostStacks) : [];
      }
    }
  }

  doToggleBlockUp(): void {
    const { player, scene } = this.arena;
    // Both arms pump out to the sides — the classic "bracing" read.
    this.playerAvatar?.play('flex');
    if (this.arena.hasUpgrade('r')) {
      // R+: Black Ice Morph replaces Block Up
      this.playerBlackIceMorphActive = !this.playerBlackIceMorphActive;
      this.convertEnemyFrostStacks(this.playerBlackIceMorphActive);
      if (this.playerBlackIceMorphActive) {
        player.incomingDamageMultiplier = this.frostDamageMultiplier(this.playerFrostStacks) * 1.25;
        player.setTint(ICE.voidGlow);
        if (!this.playerBlackIceArmor) {
          this.playerBlackIceArmor = new IceArmor(scene, this.pcol, tonesFor(true), 34, 1.15, 3, 9);
        }
        // Plates slam inward and lock: the morph lands with weight instead of blinking on.
        this.pfx.bloom(player.x, player.y, 40, 11, 4, true);
        this.pfx.rime(player.x, player.y, 40, 2, true);
        const mt = scene.add.text(player.x, player.y - 36, 'BLACK ICE', { fontSize: '11px', color: '#cc88ff', fontFamily: 'Arial Black' }).setOrigin(0.5).setDepth(12);
        scene.tweens.add({ targets: mt, y: mt.y - 20, alpha: 0, duration: 1200, onComplete: () => mt.destroy() });
      } else {
        player.incomingDamageMultiplier = this.frostDamageMultiplier(this.playerFrostStacks);
        player.clearTint();
        if (this.playerBlackIceArmor) { this.playerBlackIceArmor.destroy(); this.playerBlackIceArmor = null; }
        player.applySelfDamage(15);
        player.sizeMult = Math.max(0.3, player.sizeMult * 0.85);
        player.applySizeMult();
        // Dropping out of the morph costs HP, so it visibly breaks apart.
        this.pfx.shatter(player.x, player.y, 70, { shards: 14, vapor: 2, duration: 460, isVoid: true });
        scene.cameras.main.shake(180, 0.005);
        this.arena.showFloatingText(player.x, player.y - 30, '💢 SHATTERED', '#cc88ff');
      }
    } else {
      this.playerBlockUpActive = !this.playerBlockUpActive;
      player.incomingDamageMultiplier = this.playerBlockUpActive
        ? this.frostDamageMultiplier(this.playerFrostStacks) * 0.75
        : this.frostDamageMultiplier(this.playerFrostStacks);
      if (this.playerBlockUpActive) {
        if (!this.playerBlockUpArmor) {
          this.playerBlockUpArmor = new IceArmor(scene, this.pcol, FROST_TONES, 32, 1, 3, 8);
        }
        this.pfx.bloom(player.x, player.y, 36, 9, 4);
      } else {
        if (this.playerBlockUpArmor) { this.playerBlockUpArmor.destroy(); this.playerBlockUpArmor = null; }
        this.pfx.shards(player.x, player.y, 8, { speed: 110, size: 2.8, life: 480, fall: 40, depth: 5 });
      }
    }
  }

  doStartSkate(): void {
    const { player, scene } = this.arena;
    const time = scene.time.now;
    if (this.playerSkaterActive) {
      // Recast cancels skater mode and starts cooldown — always allowed, even mid-cooldown.
      this.playerSkaterActive = false;
      this.playerAvatar?.setHold(null);
      this.pfx.shards(player.x, player.y, 10, { speed: 130, size: 3, life: 460, fall: 44, depth: 5, isVoid: this.playerBlackIceMorphActive });
      player.startCooldown('skate');
      return;
    }
    // Determine initial heading toward cursor
    const ptr = scene.input.activePointer;
    this.playerSkaterHeading = Math.atan2(ptr.worldY - player.y, ptr.worldX - player.x);
    this.playerSkaterTrailAccum = 0;
    this.playerSkaterActive = true;
    // Launch: arms flung back then forward, and the blades bite the floor.
    this.playerAvatar?.play('dash', this.playerSkaterHeading);
    this.pfx.wake(
      player.x, player.y,
      player.x + Math.cos(this.playerSkaterHeading) * 70,
      player.y + Math.sin(this.playerSkaterHeading) * 70,
      4, this.playerBlackIceMorphActive,
    );
    // F+ synergies: spawn ice arena based on current state
    if (this.arena.hasUpgrade('f')) {
      if (this.playerBlackIceMorphActive) {
        this.spawnIceArena('player', true);
      } else if (this.playerBlockUpActive) {
        this.spawnIceArena('player', false);
      }
    }
    // Rink perk: record recent skate timestamp for bonus speed
    if (this.arena.hasPerk('player', 'rink')) this.playerSkateRecentUntil = time + 2000;
  }

  /** `noFrostStacks` — Subterfuge's Dark Treachery ice-Q copy freezes without applying frost. */
  doFireFrozenSolid(tx: number, ty: number, noFrostStacks = false): void {
    const { player, enemies, scene } = this.arena;
    const time = scene.time.now;
    // Snow perk: nothing freezes any more — the cone's worth of cold is packed into a turret.
    if (this.arena.hasPerk('player', 'snow')) { this.buildSnowTurret(tx, ty, 'player'); return; }
    const isBlackIce = this.playerBlackIceMorphActive;
    const angle = Math.atan2(ty - player.y, tx - player.x);
    // Both arms thrust out and hold — the ultimate is a shove, not a flick.
    this.playerAvatar?.play('raise', angle, 900);
    this.spawnFrozenSolidVisual(player.x, player.y, angle, isBlackIce);
    for (const t of enemies) {
      if (!t.active || t.hp <= 0) continue;
      const tAngle = Math.atan2(t.y - player.y, t.x - player.x);
      const diff = Math.abs(Phaser.Math.Angle.Wrap(tAngle - angle));
      if (diff <= Math.PI / 8) {
        if (t.frozenUntil > time) {
          t.frozenUntil = 0;
          this.arena.spawnHitFlash(t.x, t.y, isBlackIce ? ICE.voidGlow : ICE.sky);
          if (!noFrostStacks) { for (let fi = 0; fi < 3; fi++) this.addFrostStackTo(t); }
        } else {
          t.frozenUntil = time + 3000;
          this.arena.spawnHitFlash(t.x, t.y, isBlackIce ? ICE.voidGlow : ICE.sky);
          if (this.arena.hasUpgrade('q')) t.frozenSolidAmpReady = true;
        }
      }
    }
    // Rink perk: tile the cone with icy trails lasting 8s
    if (this.arena.hasPerk('player', 'rink')) this.spawnRinkConeTiles(player.x, player.y, angle, 'player');
  }

  // ── Cast context implementations — NPC ──────────────────────────────

  doNpcFireIceSpike(tx: number, ty: number): void {
    const { npc, scene, projectiles } = this.arena;
    const dx = tx - npc.x;
    const dy = ty - npc.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const angle = Math.atan2(dy, dx);
    this.npcAvatar?.play('punch', angle);
    const hand = this.npcAvatar?.castHand() ?? { x: npc.x, y: npc.y };
    this.nfx.muzzleFrost(hand.x, hand.y, angle, 1, 8);
    const proj = new Projectile(scene, npc.x, npc.y, 'proj-ice', 8, false);
    projectiles.add(proj);
    proj.launch((dx / len) * 480, (dy / len) * 480);
  }

  doNpcFireFrostBlast(tx: number, ty: number): void {
    const { player, npc, scene } = this.arena;
    if (this.playerFrostStacks === 0) return;
    const dx = tx - npc.x;
    const dy = ty - npc.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const angle = Math.atan2(dy / len, dx / len);
    const endX = npc.x + Math.cos(angle) * 1200;
    const endY = npc.y + Math.sin(angle) * 1200;
    this.npcAvatar?.play('sweep', angle);
    this.spawnFrostBeamVisual(npc.x, npc.y, endX, endY, false, 'npc');
    const d = this.arena.pointToSegmentDist(player.x, player.y, npc.x, npc.y, endX, endY);
    if (d <= 32) {
      player.takeDamage(Math.round(this.playerFrostStacks * 7.5));
      this.arena.spawnHitFlash(player.x, player.y, ICE.sky);
      this.nfx.shatter(player.x, player.y, 50 + this.playerFrostStacks * 12, {
        shards: 8 + this.playerFrostStacks * 3, vapor: 1, duration: 340 + this.playerFrostStacks * 40,
      });
      this.clearFrostStacks('player');
    }
    void scene;
  }

  doNpcToggleBlockUp(): void {
    const { npc, scene } = this.arena;
    this.npcBlockUpActive = !this.npcBlockUpActive;
    npc.incomingDamageMultiplier = this.npcBlockUpActive
      ? this.frostDamageMultiplier(npc.frostStacks) * 0.75
      : this.frostDamageMultiplier(npc.frostStacks);
    this.npcAvatar?.play('flex');
    if (this.npcBlockUpActive) {
      if (!this.npcBlockUpArmor) {
        this.npcBlockUpArmor = new IceArmor(scene, this.ncol, FROST_TONES, 32, 1, 3, 8);
      }
      this.nfx.bloom(npc.x, npc.y, 36, 9, 4);
    } else {
      if (this.npcBlockUpArmor) { this.npcBlockUpArmor.destroy(); this.npcBlockUpArmor = null; }
      this.nfx.shards(npc.x, npc.y, 8, { speed: 110, size: 2.8, life: 480, fall: 40, depth: 5 });
    }
  }

  doNpcStartSkate(): void {
    const { player, npc, scene } = this.arena;
    const time = scene.time.now;
    // NPC skate: dash away from player + leave trail
    const dx = npc.x - player.x;
    const dy = npc.y - player.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const nBody = npc.body as Phaser.Physics.Arcade.Body;
    nBody.setVelocity((dx / len) * 620, (dy / len) * 620);
    const away = Math.atan2(dy / len, dx / len);
    this.npcAvatar?.play('dash', away);
    this.nfx.wake(npc.x, npc.y, npc.x + (dx / len) * 90, npc.y + (dy / len) * 90);
    npc.isInvincible = true;
    for (let i = 0; i < 4; i++) {
      scene.time.delayedCall(i * 55, () => {
        if (npc.active) this.spawnIcyTrail(npc.x, npc.y, 'npc');
      });
    }
    scene.time.delayedCall(220, () => { if (npc.active) npc.isInvincible = false; });
    // Rink perk: record recent skate timestamp for bonus speed
    if (this.arena.hasPerk('npc', 'rink')) this.npcSkateRecentUntil = time + 2000;
  }

  doNpcFireFrozenSolid(tx: number, ty: number, noFrostStacks = false): void {
    const { player, npc, scene } = this.arena;
    const time = scene.time.now;
    const angle = Math.atan2(ty - npc.y, tx - npc.x);
    this.npcAvatar?.play('raise', angle, 900);
    this.spawnFrozenSolidVisual(npc.x, npc.y, angle, false, 'npc');
    const playerAngle = Math.atan2(player.y - npc.y, player.x - npc.x);
    const diff = Math.abs(Phaser.Math.Angle.Wrap(playerAngle - angle));
    if (diff <= Math.PI / 8) {
      if (this.playerFrozenUntil > time) {
        this.playerFrozenUntil = 0;
        if (!noFrostStacks) { for (let fi = 0; fi < 3; fi++) this.addFrostStack('player'); }
      } else {
        this.playerFrozenUntil = time + 3000;
        this.arena.spawnHitFlash(player.x, player.y, ICE.sky);
      }
    }
    // Rink perk: tile the cone with icy trails lasting 8s
    if (this.arena.hasPerk('npc', 'rink')) this.spawnRinkConeTiles(npc.x, npc.y, angle, 'npc');
  }

  // ── Private helpers ──────────────────────────────────────────────────

  private frostDamageMultiplier(stacks: number): number {
    if (stacks >= 7) return 1.75;
    if (stacks >= 6) return 1.60;
    if (stacks >= 5) return 1.45;
    if (stacks >= 4) return 1.30;
    if (stacks >= 3) return 1.20;
    return 1.0;
  }

  /** Ice Mastery — Icicle Impale: true while `f` currently carries a live (unshattered) icicle. */
  private isImpaled(f: Fighter): boolean {
    return this.icicleImpales.some((ic) => ic.target === f);
  }

  /** Ice Mastery requirement: deal over 50 damage in a single hit, 5 times. */
  private recordBigHit(amount: number): void {
    if (amount > BIG_HIT_THRESHOLD) this.arena.recordMasteryStat('bigHits', 1);
  }

  /**
   * Public: applies one frost (or void-frost) stack to any fighter — used by InvasionKit for husk
   * status effects. Defaults to whichever type Black Ice Morph implies; pass `forceVoid` to apply a
   * specific type regardless of morph state (used by Viral Frost to mirror the spreading source).
   * Never stomps a stack count already elevated past 5 by an Icicle Impale shatter.
   */
  addFrostStackTo(f: Fighter, forceVoid?: boolean): void {
    // Ruin's Combo Breaker halves every meter in the game, and a frost stack is one — carried
    // rather than rounded, because each stack has a timer of its own that a fraction would
    // desync. The bar belongs to whoever is freezing them, which in every mode this kit runs
    // in is simply the other side.
    const froster = f === this.arena.player ? this.arena.npc : this.arena.player;
    if (meterStep(froster, 'frost') <= 0) return;
    const useVoid = forceVoid ?? this.playerBlackIceMorphActive;
    const stackMs = this.isImpaled(f) ? ICICLE_EXTENDED_STACK_MS : 8000;
    if (useVoid) {
      if (Date.now() < f.voidImmuneUntil) return;
      if (f.voidFrostStacks < 5) f.voidFrostStackTimers.push(Date.now() + stackMs);
      f.voidFrostStacks = Math.max(f.voidFrostStacks, Math.min(5, f.voidFrostStacks + 1));
      f.incomingDamageMultiplier = this.frostDamageMultiplier(f.voidFrostStacks);
      this.frostSnap(f, true, f.voidFrostStacks);
    } else {
      if (Date.now() < f.frostImmuneUntil) return;
      if (f.frostStacks < 5) f.frostStackTimers.push(Date.now() + stackMs);
      f.frostStacks = Math.max(f.frostStacks, Math.min(5, f.frostStacks + 1));
      f.incomingDamageMultiplier = this.frostDamageMultiplier(f.frostStacks);
      this.frostSnap(f, false, f.frostStacks);
    }
  }

  /**
   * Rime cracking across a target as a stack lands. Scales with the stack count so the fifth
   * one visibly hits harder than the first — the debuff has to read as building, not just as a
   * number ticking up in the label above their head.
   */
  private frostSnap(f: Fighter, isVoid: boolean, stacks: number): void {
    const fx = f === this.arena.player ? this.nfx : this.pfx;
    fx.ring(f.x, f.y, 6, 26 + stacks * 5, tonesFor(isVoid).lit, 300, 3, 8);
    fx.shards(f.x, f.y, 2 + stacks, {
      speed: 60 + stacks * 12, size: 2.2, life: 420, fall: 22, depth: 8, isVoid,
    });
  }

  private addFrostStack(target: 'player' | 'npc'): void {
    if (target === 'npc') {
      this.addFrostStackTo(this.arena.npc);
    } else {
      const player = this.arena.player;
      if (Date.now() < player.frostImmuneUntil) return;
      if (this.playerFrostStacks < 5) this.playerFrostStackTimers.push(Date.now() + 8000);
      this.playerFrostStacks = Math.min(5, this.playerFrostStacks + 1);
      const baseMult = this.frostDamageMultiplier(this.playerFrostStacks);
      player.incomingDamageMultiplier = this.playerBlackIceMorphActive ? baseMult * 1.25 : baseMult;
      this.frostSnap(player, false, this.playerFrostStacks);
    }
  }

  /** R+ Black Ice toggle: swaps all of the enemy's frost stacks for void frost (or back), carrying over remaining duration. */
  private convertEnemyFrostStacks(enteringBlackIce: boolean): void {
    for (const t of this.arena.enemies) {
      if (!t.active || t.hp <= 0) continue;
      if (enteringBlackIce) {
        if (t.frostStacks === 0) continue;
        t.voidFrostStackTimers = [...t.voidFrostStackTimers, ...t.frostStackTimers].slice(-5);
        t.voidFrostStacks = t.voidFrostStackTimers.length;
        t.frostStacks = 0;
        t.frostStackTimers = [];
        const baseMult = this.frostDamageMultiplier(t.voidFrostStacks);
        t.incomingDamageMultiplier = (t === this.arena.npc && this.npcBlockUpActive) ? baseMult * 0.75 : baseMult;
        this.arena.showFloatingText(t.x, t.y - 30, '🖤 VOID FROST', '#cc88ff');
      } else {
        if (t.voidFrostStacks === 0) continue;
        t.frostStackTimers = [...t.frostStackTimers, ...t.voidFrostStackTimers].slice(-5);
        t.frostStacks = t.frostStackTimers.length;
        t.voidFrostStacks = 0;
        t.voidFrostStackTimers = [];
        const baseMult = this.frostDamageMultiplier(t.frostStacks);
        t.incomingDamageMultiplier = (t === this.arena.npc && this.npcBlockUpActive) ? baseMult * 0.75 : baseMult;
        this.arena.showFloatingText(t.x, t.y - 30, '❄️ FROST', '#aaddff');
      }
    }
  }

  /** Click+ Slush Thrower: close-range cone, low damage, refreshes (doesn't add) frost stack duration on hit. */
  private fireSlushThrower(tx: number, ty: number): void {
    const { player, enemies } = this.arena;
    const range = 150;
    const halfAngleCos = 0.8; // ~37° half-angle
    const halfAngleRad = Math.acos(halfAngleCos);
    const damage = 2;
    const dx = tx - player.x;
    const dy = ty - player.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const nx = dx / len;
    const ny = dy / len;
    const baseAngle = Math.atan2(ny, nx);
    const isBlackIce = this.playerBlackIceMorphActive;

    // A churning cone of slush: nested wedges of shard-flecked ice that re-roll every tick, so
    // a held spray boils instead of strobing one fixed triangle.
    this.playerAvatar?.setHold('spray', baseAngle);
    const tones = tonesFor(isBlackIce);
    const wedges = Array.from({ length: 5 }, (_, i) => ({
      off: ((i / 4) - 0.5) * 1.7 * halfAngleRad,
      len: range * (0.55 + Math.random() * 0.5),
      w: 10 + Math.random() * 9,
      skew: (Math.random() - 0.5) * 1.3,
    }));
    this.pfx.anim(8, 200, (g, t) => {
      const grow = 0.6 + t * 0.5;
      const fade = 1 - t * t;
      for (const w of wedges) {
        g.fillStyle(this.pcol(tones.shell), 0.45 * fade);
        iceShard(g, player.x + Math.cos(baseAngle + w.off) * 14, player.y + Math.sin(baseAngle + w.off) * 14,
          baseAngle + w.off, w.len * grow, w.w * 1.4, w.skew);
        g.fillStyle(this.pcol(tones.body), 0.7 * fade);
        iceShard(g, player.x + Math.cos(baseAngle + w.off) * 14, player.y + Math.sin(baseAngle + w.off) * 14,
          baseAngle + w.off, w.len * grow * 0.92, w.w, w.skew);
      }
      // Nozzle bloom where the slush leaves the caster.
      g.fillStyle(this.pcol(tones.lit), 0.5 * fade);
      g.fillCircle(player.x + Math.cos(baseAngle) * 18, player.y + Math.sin(baseAngle) * 18, 9 * grow);
    });
    this.pfx.shards(
      player.x + Math.cos(baseAngle) * range * 0.6, player.y + Math.sin(baseAngle) * range * 0.6,
      3, { angle: baseAngle, spread: halfAngleRad, speed: 90, size: 2.6, life: 340, fall: 28, depth: 8, isVoid: isBlackIce },
    );
    this.slushNudgeCurlingStone(baseAngle, range, halfAngleCos);

    for (const t of enemies) {
      if (!t.active || t.hp <= 0) continue;
      const dist = Phaser.Math.Distance.Between(player.x, player.y, t.x, t.y);
      if (dist > range) continue;
      const dot = (nx * (t.x - player.x) + ny * (t.y - player.y)) / dist;
      if (dot < halfAngleCos) continue;

      t.takeDamage(damage);
      this.arena.spawnHitFlash(t.x, t.y, isBlackIce ? ICE.voidGlow : ICE.sky);

      if (isBlackIce) {
        if (t.voidFrostStackTimers.length > 0) {
          const freshExpiry = Date.now() + 8000;
          t.voidFrostStackTimers = t.voidFrostStackTimers.map(() => freshExpiry);
        }
      } else if (t.frostStackTimers.length > 0) {
        const freshExpiry = Date.now() + 8000;
        t.frostStackTimers = t.frostStackTimers.map(() => freshExpiry);
      }
    }
  }

  private clearFrostStacks(target: 'player' | 'npc'): void {
    if (target === 'npc') {
      this.arena.npc.frostStacks = 0;
      this.arena.npc.frostStackTimers = [];
      this.arena.npc.incomingDamageMultiplier = 1;
    } else {
      this.playerFrostStacks = 0;
      this.playerFrostStackTimers = [];
      this.arena.player.incomingDamageMultiplier = this.playerBlackIceMorphActive ? 1.25 : 1;
    }
  }

  // ── Ice Mastery: Icicle Impale ──────────────────────────────────────

  /**
   * Fires whichever mastery ability is bound over `slot` and reports whether the slot was
   * taken over — a bound slot swallows the keypress even on cooldown, so the base ability
   * never leaks through underneath it.
   */
  private castMasteryBind(slot: 'e' | 'r' | 'f' | 'q', time: number): boolean {
    if (!this.arena.masteryActive) return false;
    switch (this.arena.masteryBindFor(slot)) {
      case 'icicle-impale': this.tryCastIcicleImpale(time); return true;
      case 'curling-stone': this.tryCastCurlingStone(time); return true;
      default: return false;
    }
  }

  private tryCastIcicleImpale(time: number): void {
    if (time - this.icicleImpaleLastCastAt < ICICLE_IMPALE_COOLDOWN_MS) return;
    this.icicleImpaleLastCastAt = time;
    const { player, scene } = this.arena;
    player.triggerCooldown('icicle-impale');
    const ptr = scene.input.activePointer;
    const angle = Math.atan2(ptr.worldY - player.y, ptr.worldX - player.x);
    this.icicleDashActive = true;
    this.icicleDashUntil = time + ICICLE_DASH_DURATION_MS;
    this.icicleDashVx = Math.cos(angle) * ICICLE_DASH_SPEED;
    this.icicleDashVy = Math.sin(angle) * ICICLE_DASH_SPEED;
    this.icicleDashHitThisDash = false;
    // Wind up and fling: a blade-carved corridor along the whole dash path.
    this.playerAvatar?.play('dash', angle);
    this.pfx.wake(
      player.x, player.y,
      player.x + Math.cos(angle) * ICICLE_DASH_SPEED * (ICICLE_DASH_DURATION_MS / 1000),
      player.y + Math.sin(angle) * ICICLE_DASH_SPEED * (ICICLE_DASH_DURATION_MS / 1000),
      5, this.playerBlackIceMorphActive,
    );
    this.arena.showFloatingText(player.x, player.y - 30, '🧊 ICICLE IMPALE', '#aaddff');
  }

  /** Live icicles track damage taken by their host and shatter at the threshold. Owner-agnostic. */
  private tickIcicleImpales(): void {
    for (let ii = this.icicleImpales.length - 1; ii >= 0; ii--) {
      const ic = this.icicleImpales[ii];
      if (!ic.target.active || ic.target.hp <= 0) {
        ic.sprite.destroy();
        this.icicleImpales.splice(ii, 1);
        continue;
      }
      this.drawIcicle(ic.sprite, ic.target.x, ic.target.y, ic.isVoid, ic.damageTaken / ICICLE_SHATTER_DAMAGE_THRESHOLD);
      const dmgSinceLast = Math.max(0, ic.lastHp - ic.target.hp);
      ic.lastHp = ic.target.hp;
      if (dmgSinceLast > 0) {
        ic.damageTaken += dmgSinceLast;
        if (ic.damageTaken >= ICICLE_SHATTER_DAMAGE_THRESHOLD) {
          this.shatterIcicle(ic);
          ic.sprite.destroy();
          this.icicleImpales.splice(ii, 1);
        }
      }
    }
  }

  /** Online replay: the remote ice player cast Icicle Impale — impale us as their dash reaches us. */
  doNpcIcicleImpale(): void {
    this.npcIcicleDashActive = true;
    this.npcIcicleDashUntil = this.arena.scene.time.now + ICICLE_DASH_DURATION_MS;
    this.npcIcicleDashHit = false;
  }

  /** Online: opponent is ice — watch their replayed dash for impact and track live icicles on us. */
  updateNpc(time: number): void {
    const { npc, player } = this.arena;
    if (this.npcIcicleDashActive) {
      if (time >= this.npcIcicleDashUntil) {
        this.npcIcicleDashActive = false;
      } else if (!this.npcIcicleDashHit && player.active && player.hp > 0
        && Phaser.Math.Distance.Between(npc.x, npc.y, player.x, player.y) <= ICICLE_HIT_RADIUS) {
        this.npcIcicleDashHit = true;
        this.impaleTarget(player);
      }
    }
    this.tickIcicleImpales();
  }

  private impaleTarget(target: Fighter): void {
    const scene = this.arena.scene;
    // Drop any existing icicle already tracking this target — a fresh impale replaces it.
    const existingIdx = this.icicleImpales.findIndex((ic) => ic.target === target);
    if (existingIdx >= 0) {
      this.icicleImpales[existingIdx].sprite.destroy();
      this.icicleImpales.splice(existingIdx, 1);
    }
    const isVoid = target.voidFrostStacks > 0;
    const sprite = scene.add.graphics().setDepth(11);
    this.drawIcicle(sprite, target.x, target.y, isVoid, 0);
    this.icicleImpales.push({ target, sprite, lastHp: target.hp, damageTaken: 0, isVoid });
    this.arena.spawnHitFlash(target.x, target.y, isVoid ? ICE.voidGlow : ICE.teal);
    // The spike is driven in from above, so the impact throws chips out of the wound.
    this.pfx.icePillar(target.x, target.y - 8, 14, 46, 10, isVoid);
    this.pfx.shards(target.x, target.y, 10, { speed: 150, size: 3, life: 460, fall: 44, depth: 10, isVoid });
    scene.cameras.main.shake(140, 0.005);
    this.arena.showFloatingText(target.x, target.y - 30, '🧊 IMPALED', '#aaddff');
  }

  /** `charge` is 0–1 toward the shatter threshold and fills the band on the shaft. */
  private drawIcicle(g: Phaser.GameObjects.Graphics, x: number, y: number, isVoid: boolean, charge: number): void {
    g.clear();
    IceFx.drawIcicle(g, this.pcol, tonesFor(isVoid), x, y, this.arena.scene.time.now / 1000, charge);
  }

  private shatterIcicle(ic: IceIcicle): void {
    const t = ic.target;
    const useVoid = t.voidFrostStacks > 0 || (t.frostStacks === 0 && ic.isVoid);
    const fresh = Date.now() + ICICLE_EXTENDED_STACK_MS;
    // Combo Breaker again, on the two-stack shatter — see `addFrostStackTo`.
    const froster = t === this.arena.player ? this.arena.npc : this.arena.player;
    if (useVoid) {
      const add = meterStep(froster, 'frost',
        Math.min(2, Math.max(0, ICICLE_STACK_HARD_CAP - t.voidFrostStacks)));
      for (let i = 0; i < add; i++) t.voidFrostStackTimers.push(fresh);
      t.voidFrostStacks = Math.min(ICICLE_STACK_HARD_CAP, t.voidFrostStacks + add);
      t.incomingDamageMultiplier = this.frostDamageMultiplier(t.voidFrostStacks);
    } else {
      const add = meterStep(froster, 'frost',
        Math.min(2, Math.max(0, ICICLE_STACK_HARD_CAP - t.frostStacks)));
      for (let i = 0; i < add; i++) t.frostStackTimers.push(fresh);
      t.frostStacks = Math.min(ICICLE_STACK_HARD_CAP, t.frostStacks + add);
      t.incomingDamageMultiplier = this.frostDamageMultiplier(t.frostStacks);
    }
    this.arena.spawnHitFlash(t.x, t.y, useVoid ? ICE.voidGlow : ICE.teal);
    // The icicle bursts rather than fading — this is the payoff the charge band promised.
    this.pfx.shatter(t.x, t.y, 78, { shards: 16, vapor: 2, duration: 480, isVoid: useVoid });
    this.arena.scene.cameras.main.shake(220, 0.007);
    this.arena.showFloatingText(t.x, t.y - 30, '💥 SHATTER', '#aaddff');
  }

  // ── Snow perk: the snowball turret ──────────────────────────────────

  /**
   * Frozen Solid with Snow equipped: instead of a cone that locks people in place, the whole
   * cast is packed into an emplacement standing where you aimed. It arrives empty — the frost
   * it throws is frost you have to shoot into it.
   */
  private buildSnowTurret(tx: number, ty: number, owner: 'player' | 'npc'): void {
    const { scene } = this.arena;
    const caster = owner === 'player' ? this.arena.player : this.arena.npc;
    const wb = scene.physics.world.bounds;
    const x = Phaser.Math.Clamp(tx, wb.x + 34, wb.right - 34);
    const y = Phaser.Math.Clamp(ty, wb.y + 34, wb.bottom - 34);
    const angle = Math.atan2(y - caster.y, x - caster.x);
    (owner === 'player' ? this.playerAvatar : this.npcAvatar)?.play('raise', angle, 800);

    this.snowTurrets.push({
      gfx: scene.add.graphics().setDepth(5),
      x, y, ammo: 0, aim: angle, t: 0,
      nextFireAt: scene.time.now + SNOW_FIRE_INTERVAL_MS,
      expiresAt: scene.time.now + SNOW_TURRET_MS,
      owner,
      ammoLabel: scene.add.text(x, y - 46, '❄️ 0', {
        fontSize: '11px', fontFamily: '"Arial Black", "Segoe UI Black", Impact, sans-serif',
        color: '#cceeff', stroke: '#062338', strokeThickness: 3,
      }).setOrigin(0.5).setDepth(12),
    });

    // It is thrown up out of the floor: a pillar of snow that packs itself down into a turret.
    const fx = this.fx(owner);
    fx.icePillar(x, y, 24, 66);
    fx.bloom(x, y, 42, 11, 4);
    fx.rime(x, y, 40, 1);
    scene.cameras.main.shake(120, 0.004);
    this.arena.showFloatingText(x, y - 62, '⛄ SNOW TURRET!', '#cceeff');
  }

  /** Feeds, aims, fires and finally melts every turret, then flies its rounds. */
  private updateSnowTurrets(time: number, delta: number): void {
    if (this.snowTurrets.length > 0) {
      const dt = delta / 1000;
      for (let i = this.snowTurrets.length - 1; i >= 0; i--) {
        const turret = this.snowTurrets[i];
        const fx = this.fx(turret.owner);

        if (time >= turret.expiresAt) {
          fx.shatter(turret.x, turret.y, 70, { shards: 14, vapor: 3, duration: 460 });
          turret.gfx.destroy();
          turret.ammoLabel?.destroy();
          this.snowTurrets.splice(i, 1);
          continue;
        }

        // Loading: every round its owner shoots into it is one round it can throw back.
        for (const child of this.arena.projectiles.getChildren()) {
          const proj = child as Projectile;
          if (!proj.active || proj.isFromPlayer !== (turret.owner === 'player')) continue;
          if (Phaser.Math.Distance.Between(proj.x, proj.y, turret.x, turret.y) > SNOW_FEED_RADIUS) continue;
          proj.destroy();
          if (turret.ammo >= SNOW_AMMO_MAX) {
            this.arena.showFloatingText(turret.x, turret.y - 58, 'FULL', '#88aacc');
            continue;
          }
          turret.ammo++;
          fx.bloom(turret.x, turret.y - 10, 26, 7, 6);
          this.arena.showFloatingText(turret.x, turret.y - 58, `❄️ +1 (${turret.ammo})`, '#cceeff');
        }

        // Tracking: the barrel swings round rather than snapping, so it can be walked around.
        const mark = this.snowTurretTarget(turret);
        if (mark) {
          const want = Math.atan2(mark.y - turret.y, mark.x - turret.x);
          turret.aim += Phaser.Math.Clamp(Phaser.Math.Angle.Wrap(want - turret.aim), -2.4 * dt, 2.4 * dt);
        }

        turret.t += dt;
        const ready = Phaser.Math.Clamp(1 - (turret.nextFireAt - time) / SNOW_FIRE_INTERVAL_MS, 0, 1);
        if (turret.gfx.active) {
          turret.gfx.clear();
          const left = turret.expiresAt - time;
          IceFx.drawSnowTurret(
            turret.gfx, this.col(turret.owner), FROST_TONES,
            turret.x, turret.y, turret.aim, turret.t, turret.ammo, ready,
            left < 1200 ? Math.max(0.15, left / 1200) : 1,
          );
        }
        turret.ammoLabel?.setPosition(turret.x, turret.y - 46).setText(`❄️ ${turret.ammo}`);

        if (mark && turret.ammo > 0 && time >= turret.nextFireAt) {
          turret.nextFireAt = time + SNOW_FIRE_INTERVAL_MS;
          turret.ammo--;
          this.fireSnowball(turret, mark);
        } else if (turret.ammo <= 0) {
          // An empty turret never comes off cooldown early — it waits for its next round.
          turret.nextFireAt = Math.max(turret.nextFireAt, time + 400);
        }
      }
    }

    this.updateSnowballs(time, delta);

    // The chill the rounds leave behind, ticked here so it lapses even after the turret melts.
    for (const [f, until] of this.snowSlowUntil) {
      if (!f.active) { this.snowSlowUntil.delete(f); continue; }
      if (time >= until) { f.walkSpeedMult = 1; this.snowSlowUntil.delete(f); }
      else f.walkSpeedMult = Math.min(f.walkSpeedMult, SNOW_SLOW_MULT);
    }
  }

  /** Nearest live target in range for a turret, or null if it has nothing to shoot at. */
  private snowTurretTarget(turret: SnowTurret): Fighter | null {
    const candidates = turret.owner === 'player' ? this.arena.enemies : [this.arena.player];
    let best: Fighter | null = null;
    let bestD = SNOW_TURRET_RANGE;
    for (const t of candidates) {
      if (!t.active || t.hp <= 0) continue;
      const d = Phaser.Math.Distance.Between(turret.x, turret.y, t.x, t.y);
      if (d < bestD) { bestD = d; best = t; }
    }
    return best;
  }

  private fireSnowball(turret: SnowTurret, mark: Fighter): void {
    const { scene } = this.arena;
    const angle = Math.atan2(mark.y - turret.y, mark.x - turret.x);
    turret.aim = angle;
    const mx = turret.x + Math.cos(angle) * 34;
    const my = turret.y - 16 + Math.sin(angle) * 34;
    this.snowballs.push({
      gfx: scene.add.graphics().setDepth(8),
      x: mx, y: my,
      vx: Math.cos(angle) * SNOW_BALL_SPEED,
      vy: Math.sin(angle) * SNOW_BALL_SPEED,
      t: 0,
      expiresAt: scene.time.now + 2500,
      owner: turret.owner,
    });
    const fx = this.fx(turret.owner);
    fx.muzzleFrost(mx, my, angle, 0.9, 7);
    fx.vapor(turret.x, turret.y - 12, 3, 18, 6);
  }

  private updateSnowballs(time: number, delta: number): void {
    if (this.snowballs.length === 0) return;
    const dt = delta / 1000;
    const wb = this.arena.scene.physics.world.bounds;

    for (let i = this.snowballs.length - 1; i >= 0; i--) {
      const ball = this.snowballs[i];
      ball.x += ball.vx * dt;
      ball.y += ball.vy * dt;
      ball.t += dt;
      if (ball.gfx.active) {
        ball.gfx.clear();
        IceFx.drawSnowball(ball.gfx, this.col(ball.owner), FROST_TONES, ball.x, ball.y, Math.atan2(ball.vy, ball.vx), ball.t);
      }

      const targets: Fighter[] = ball.owner === 'player' ? this.arena.enemies : [this.arena.player];
      let struck: Fighter | null = null;
      for (const t of targets) {
        if (!t.active || t.hp <= 0) continue;
        if (Phaser.Math.Distance.Between(ball.x, ball.y, t.x, t.y) <= SNOW_BALL_HIT_RADIUS) { struck = t; break; }
      }

      if (struck) {
        struck.takeDamage(SNOW_BALL_DAMAGE);
        if (ball.owner === 'player') { this.addFrostStackTo(struck); this.recordBigHit(SNOW_BALL_DAMAGE); }
        else this.addFrostStack('player');
        this.snowSlowUntil.set(struck, Math.max(this.snowSlowUntil.get(struck) ?? 0, time + SNOW_SLOW_MS));
        this.arena.spawnHitFlash(struck.x, struck.y, ICE.pale);
        this.fx(ball.owner).shatter(struck.x, struck.y, 40, { shards: 8, vapor: 2, rime: false, duration: 300 });
        this.arena.showFloatingText(struck.x, struck.y - 30, '⛄ SNOWBALL! -50%', '#cceeff');
      }

      const outside = ball.x < wb.x || ball.x > wb.right || ball.y < wb.y || ball.y > wb.bottom;
      if (struck || outside || time >= ball.expiresAt) {
        if (!struck) this.fx(ball.owner).vapor(ball.x, ball.y, 3, 14, 6);
        ball.gfx.destroy();
        this.snowballs.splice(i, 1);
      }
    }
  }

  // ── Ice Mastery: Curling Stone ──────────────────────────────────────

  private tryCastCurlingStone(time: number): void {
    if (time - this.curlingLastCastAt < CURLING_COOLDOWN_MS) return;
    this.curlingLastCastAt = time;
    const { player, scene } = this.arena;
    // triggerCooldown already broadcasts the cast id online; the peer replays via doNpcCurlingStone.
    player.triggerCooldown('curling-stone');
    const ptr = scene.input.activePointer;
    const angle = Math.atan2(ptr.worldY - player.y, ptr.worldX - player.x);
    // Both arms shove it out in front — the stone is set down, not thrown.
    this.playerAvatar?.play('raise', angle, 420);
    this.spawnCurlingStone(
      player.x + Math.cos(angle) * 62, player.y + Math.sin(angle) * 62, 'player',
    );
    this.arena.showFloatingText(player.x, player.y - 30, '🥌 CURLING STONE', '#aaddff');
  }

  /** Online replay: the remote ice player summoned their stone, so it exists on this sim too. */
  doNpcCurlingStone(tx: number, ty: number): void {
    const { npc } = this.arena;
    const angle = Math.atan2(ty - npc.y, tx - npc.x);
    this.npcAvatar?.play('raise', angle, 420);
    this.spawnCurlingStone(npc.x + Math.cos(angle) * 62, npc.y + Math.sin(angle) * 62, 'npc');
  }

  private spawnCurlingStone(x: number, y: number, owner: 'player' | 'npc'): void {
    const { scene } = this.arena;
    // One stone per owner — a fresh summon replaces whatever is still sliding around.
    const existing = this.curlingStones.findIndex((s) => s.owner === owner);
    if (existing >= 0) {
      this.curlingStones[existing].gfx.destroy();
      this.curlingStones.splice(existing, 1);
    }
    const wb = scene.physics.world.bounds;
    const isVoid = owner === 'player' && this.playerBlackIceMorphActive;
    const sx = Phaser.Math.Clamp(x, wb.x + CURLING_RADIUS, wb.right - CURLING_RADIUS);
    const sy = Phaser.Math.Clamp(y, wb.y + CURLING_RADIUS, wb.bottom - CURLING_RADIUS);
    this.curlingStones.push({
      gfx: scene.add.graphics().setDepth(5),
      x: sx, y: sy, vx: 0, vy: 0, spin: 0, stacks: 0, isVoid, owner,
      expiresAt: scene.time.now + CURLING_LIFETIME_MS,
      hitCooldowns: new Map(), shoved: new WeakSet(), chipAccum: 0,
    });
    // It lands with weight: plates slamming together and rime spidering out from underneath.
    const fx = this.fx(owner);
    fx.bloom(sx, sy, 30, 9, 4, isVoid);
    fx.rime(sx, sy, 32, 1, isVoid);
    scene.cameras.main.shake(130, 0.004);
  }

  /**
   * Slide, bounce, crush. Owner-agnostic: the player's stone answers to their shots and hurts
   * the enemies, an online peer's stone answers to theirs and hurts us.
   */
  private updateCurlingStones(time: number, delta: number): void {
    if (this.curlingStones.length === 0) return;
    const { player, enemies, scene } = this.arena;
    const wb = scene.physics.world.bounds;
    const dt = delta / 1000;

    for (let si = this.curlingStones.length - 1; si >= 0; si--) {
      const stone = this.curlingStones[si];
      const tones = tonesFor(stone.isVoid);
      const fx = this.fx(stone.owner);

      if (time >= stone.expiresAt) {
        fx.shatter(stone.x, stone.y, 62, { shards: 15, vapor: 2, duration: 470, isVoid: stone.isVoid });
        stone.gfx.destroy();
        this.curlingStones.splice(si, 1);
        continue;
      }

      // Shots shove it. A piercing spike carries on through, but only counts once.
      for (const child of this.arena.projectiles.getChildren()) {
        const proj = child as Projectile;
        if (!proj.active || proj.isFromPlayer !== (stone.owner === 'player')) continue;
        if (stone.shoved.has(proj)) continue;
        if (Phaser.Math.Distance.Between(proj.x, proj.y, stone.x, stone.y) > CURLING_RADIUS + 8) continue;
        stone.shoved.add(proj);
        this.shoveCurlingStone(stone, proj.x, proj.y, this.projAngle(proj));
      }

      // A Skate trail turns the floor to glass: barely any drag and a huge speed multiplier.
      const onSkate = this.icyTrails.some((t) => t.owner === stone.owner && t.skater
        && Phaser.Math.Distance.Between(t.x, t.y, stone.x, stone.y) <= t.radius);
      const speed = Math.hypot(stone.vx, stone.vy);
      const speedMult = onSkate ? CURLING_SKATE_SPEED_MULT : 1;

      if (speed > 1) {
        stone.x += stone.vx * speedMult * dt;
        stone.y += stone.vy * speedMult * dt;
        stone.spin += speed * speedMult * dt * 0.022;

        // Frost is what carries it: each stack shaves the drag as well as raising the push.
        const drag = onSkate ? CURLING_SKATE_DRAG : Math.max(1.7, 4.5 - stone.stacks * 0.45);
        const decay = Math.exp(-drag * dt);
        stone.vx *= decay;
        stone.vy *= decay;
        if (Math.hypot(stone.vx, stone.vy) < 6) { stone.vx = 0; stone.vy = 0; }
      }

      // Walls: the stone rebounds off them, losing a little on each rail.
      let bounced = false;
      if (stone.x <= wb.x + CURLING_RADIUS) {
        stone.x = wb.x + CURLING_RADIUS; stone.vx = Math.abs(stone.vx) * 0.86; bounced = true;
      } else if (stone.x >= wb.right - CURLING_RADIUS) {
        stone.x = wb.right - CURLING_RADIUS; stone.vx = -Math.abs(stone.vx) * 0.86; bounced = true;
      }
      if (stone.y <= wb.y + CURLING_RADIUS) {
        stone.y = wb.y + CURLING_RADIUS; stone.vy = Math.abs(stone.vy) * 0.86; bounced = true;
      } else if (stone.y >= wb.bottom - CURLING_RADIUS) {
        stone.y = wb.bottom - CURLING_RADIUS; stone.vy = -Math.abs(stone.vy) * 0.86; bounced = true;
      }
      if (bounced && speed > 60) {
        fx.shards(stone.x, stone.y, 5, {
          speed: 120, size: 2.8, life: 360, fall: 26, depth: 7, isVoid: stone.isVoid,
        });
        fx.ring(stone.x, stone.y, 5, 28, tones.lit, 260, 3, 6);
      }

      // Chips flying off the back edge while it runs.
      if (speed > CURLING_MOVING_SPEED) {
        stone.chipAccum += delta;
        if (stone.chipAccum >= (onSkate ? 45 : 95)) {
          stone.chipAccum = 0;
          fx.shards(stone.x, stone.y + 6, onSkate ? 3 : 2, {
            angle: Math.atan2(-stone.vy, -stone.vx), spread: 0.5,
            speed: 70, size: 2.4, life: 320, fall: 12, depth: 4, isVoid: stone.isVoid,
          });
        }

        const damage = Math.round(CURLING_BASE_DAMAGE * (1 + stone.stacks * CURLING_DAMAGE_PER_STACK));
        const targets: Fighter[] = stone.owner === 'player' ? enemies : [player];
        for (const t of targets) {
          if (!t.active || t.hp <= 0) continue;
          if (time < (stone.hitCooldowns.get(t) ?? 0)) continue;
          if (Phaser.Math.Distance.Between(stone.x, stone.y, t.x, t.y) > CURLING_HIT_RADIUS) continue;
          stone.hitCooldowns.set(t, time + CURLING_HIT_COOLDOWN_MS);
          t.takeDamage(damage);
          if (stone.owner === 'player') this.recordBigHit(damage);
          this.arena.spawnHitFlash(t.x, t.y, stone.isVoid ? ICE.voidGlow : ICE.sky);
          fx.shatter(t.x, t.y, 46, {
            shards: 10, vapor: 1, rime: false, duration: 310, isVoid: stone.isVoid,
          });
          scene.cameras.main.shake(150, 0.005);
          this.arena.showFloatingText(t.x, t.y - 34, '🥌 CRUSHED', stone.isVoid ? '#cc88ff' : '#aaddff');
          // It keeps going, but the collision takes the legs out of the slide.
          stone.vx *= 0.55;
          stone.vy *= 0.55;
        }
      }

      const left = stone.expiresAt - time;
      stone.gfx.clear();
      IceFx.drawCurlingStone(
        stone.gfx, this.col(stone.owner), tones,
        stone.x, stone.y, stone.spin, time / 1000, stone.stacks,
        left < 1500 ? Math.max(0.2, left / 1500) : 1,
      );
    }
  }

  /** Direction a shot is travelling, for anything that needs to be pushed the way it was hit. */
  private projAngle(proj: Projectile): number {
    const body = proj.body as Phaser.Physics.Arcade.Body | null;
    if (!body || (body.velocity.x === 0 && body.velocity.y === 0)) return 0;
    return Math.atan2(body.velocity.y, body.velocity.x);
  }

  /**
   * One shot's worth of shove. The stone takes on whichever frost its owner is currently
   * throwing, so void frost reads and behaves identically to light frost here.
   */
  private shoveCurlingStone(stone: CurlingStone, hitX: number, hitY: number, angle: number): void {
    if (stone.owner === 'player') stone.isVoid = this.playerBlackIceMorphActive;
    if (stone.stacks < CURLING_MAX_STACKS) stone.stacks++;
    const push = CURLING_BASE_PUSH + stone.stacks * CURLING_PUSH_PER_STACK;
    stone.vx += Math.cos(angle) * push;
    stone.vy += Math.sin(angle) * push;

    const tones = tonesFor(stone.isVoid);
    const fx = this.fx(stone.owner);
    this.arena.spawnHitFlash(hitX, hitY, stone.isVoid ? ICE.voidGlow : ICE.frost);
    fx.shards(stone.x, stone.y, 4, {
      angle, spread: 0.8, speed: 95, size: 2.6, life: 340, fall: 24, depth: 7, isVoid: stone.isVoid,
    });
    fx.ring(stone.x, stone.y, 6, 24 + stone.stacks * 5, tones.lit, 260, 3, 6);
    if (stone.owner === 'player') {
      this.arena.showFloatingText(stone.x, stone.y - 30, `❄️×${stone.stacks}`, '#aaddff');
    }
  }

  /** Click+ Slush Thrower has no projectile to shove with, so the spray itself nudges the stone. */
  private slushNudgeCurlingStone(baseAngle: number, range: number, halfAngleCos: number): void {
    const { player } = this.arena;
    const stone = this.curlingStones.find((s) => s.owner === 'player');
    if (!stone) return;
    const dist = Phaser.Math.Distance.Between(player.x, player.y, stone.x, stone.y);
    if (dist > range || dist < 1) return;
    const dot = (Math.cos(baseAngle) * (stone.x - player.x) + Math.sin(baseAngle) * (stone.y - player.y)) / dist;
    if (dot < halfAngleCos) return;
    // A fifth of a shot's shove per tick, and no stack — slush only refreshes frost, it never adds.
    stone.isVoid = this.playerBlackIceMorphActive;
    const push = (CURLING_BASE_PUSH + stone.stacks * CURLING_PUSH_PER_STACK) * 0.2;
    stone.vx += Math.cos(baseAngle) * push;
    stone.vy += Math.sin(baseAngle) * push;
  }

  private spawnIcyTrail(x: number, y: number, owner: 'player' | 'npc', opts?: { skater?: boolean }): void {
    const { scene } = this.arena;
    const isVoid = owner === 'player' && this.playerBlackIceMorphActive;
    this.icyTrails.push({
      gfx: scene.add.graphics().setDepth(2),
      expiresAt: scene.time.now + 5000,
      spawnAt: scene.time.now,
      seed: Math.random() * 100,
      x, y, radius: 32, frostTickAccum: 0, owner, isVoid, skater: opts?.skater,
    });
  }

  private spawnRinkConeTiles(ox: number, oy: number, angle: number, owner: 'player' | 'npc'): void {
    const { scene } = this.arena;
    const half = Math.PI / 8;
    const steps = [0.15, 0.3, 0.45, 0.6, 0.72, 0.84, 0.92, 1.0];
    const offsets = [-0.6, -0.25, 0.25, 0.6];
    for (const t of steps) {
      const r = t * 1200;
      for (const ao of offsets) {
        const a = angle + ao * half;
        const tx = ox + Math.cos(a) * r;
        const ty = oy + Math.sin(a) * r;
        this.icyTrails.push({
          gfx: scene.add.graphics().setDepth(2),
          expiresAt: scene.time.now + 8000,
          // Staggered by distance so the rink visibly freezes outward from the caster.
          spawnAt: scene.time.now + t * 220,
          seed: Math.random() * 100,
          x: tx, y: ty, radius: 28, frostTickAccum: 0, owner, isVoid: false, rink: true,
        });
      }
    }
  }

  private spawnFrozenSolidVisual(
    x: number, y: number, angle: number, isVoid = false, owner: 'player' | 'npc' = 'player',
  ): void {
    // 22.5° half-angle out to the arena borders, matching the hit test exactly.
    this.fx(owner).frostCone(x, y, angle, 1200, Math.PI / 8, 7, isVoid);
    this.arena.scene.cameras.main.shake(200, 0.005);
  }

  private spawnIceArena(owner: 'player' | 'npc', isVoid: boolean): void {
    const { player, npc, enemies, scene } = this.arena;
    const fighter = owner === 'player' ? player : npc;
    const radius = isVoid ? 60 : 120;
    this.iceArenas.push({
      gfx: scene.add.graphics().setDepth(2),
      seed: Math.random() * 100,
      spawnAt: scene.time.now,
      x: fighter.x, y: fighter.y, radius,
      expiresAt: scene.time.now + 5000, tickAccum: 0, isVoid, owner,
    });
    // The whole floor freezes over at once — a rim spreading out from under the caster.
    const fx = this.fx(owner);
    fx.ring(fighter.x, fighter.y, 12, radius * 1.1, tonesFor(isVoid).lit, 520, 5, 3);
    fx.icePillar(fighter.x, fighter.y, 20, 70, 6, isVoid);
    // Initial creation: permafrost or permavoid on any enemy inside the radius
    const targets = owner === 'player' ? (enemies as Fighter[]) : [player as Fighter];
    for (const t of targets) {
      if (!t.active || t.hp <= 0) continue;
      const d = Phaser.Math.Distance.Between(fighter.x, fighter.y, t.x, t.y);
      if (d > radius) continue;
      if (isVoid) {
        t.permavoidStacks = Math.min(3, t.permavoidStacks + 1);
        this.arena.showFloatingText(t.x, t.y - 30, '🟣 PERMAVOID', '#cc88ff');
      } else {
        t.permafrostStacks = Math.min(3, t.permafrostStacks + 1);
        this.arena.showFloatingText(t.x, t.y - 30, '❄️ PERMAFROST', '#aaddff');
      }
    }
    this.arena.showFloatingText(fighter.x, fighter.y - 30, isVoid ? '🖤 DARK ICE ARENA' : '❄️ ICE ARENA', isVoid ? '#9900ff' : '#88ccff');
  }

  private spawnFrostBeamVisual(
    x1: number, y1: number, x2: number, y2: number, isVoid = false, owner: 'player' | 'npc' = 'player',
  ): void {
    this.fx(owner).beam(x1, y1, x2, y2, isVoid);
  }
}
