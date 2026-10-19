import Phaser from 'phaser';
import { Fighter } from '../../entities/Fighter';
import { CastContext } from '../Ability';
import { Projectile } from '../../combat/Projectile';
import { meterStep } from '../../combat/Meters';
import {
  FROST_TONES, ICE, IceArmor, IceAvatar, IceColorFn, IceFx, iceShard, tonesFor,
} from './IceVisuals';
import { FONT_DISPLAY } from '../../ui/Theme';

type StackKind = 'frost' | 'permafrost' | 'permavoid' | 'voidfrost';

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
 * Ice Mastery — Curling Bomb: a packed-ice bomb set down in front of its owner. It is inert
 * until one of the owner's own shots strikes it: that lights the wick and launches it the way
 * the shot was travelling, and a second and a half later it goes off — damage, two stacks, and
 * a permanently slower thaw on everyone it catches. Black Ice paints it void and it throws
 * void frost instead.
 */
interface CurlingBomb {
  gfx: Phaser.GameObjects.Graphics;
  x: number; y: number;
  vx: number; vy: number;
  /** Accumulated roll, so the band and rime turn as it travels. */
  spin: number;
  isVoid: boolean;
  owner: 'player' | 'npc';
  /** An unlit bomb melts away at this time. */
  expiresAt: number;
  /** Set the moment a shot lights the wick; the blast goes off at this time. */
  detonateAt: number | null;
  /** Shots that already struck this bomb — a piercing spike passes through but only counts once. */
  struck: WeakSet<Phaser.GameObjects.GameObject>;
  chipAccum: number;
}

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

const CURLING_BOMB_COOLDOWN_MS = 20000;
/** An unlit bomb melts after this long. */
const CURLING_BOMB_LIFETIME_MS = 20000;
/** Half-width of the bomb, used for wall bounces and for catching shots. */
const CURLING_BOMB_RADIUS = 15;
const CURLING_BOMB_FUSE_MS = 1500;
const CURLING_BOMB_LAUNCH_SPEED = 330;
/** Drag on a lit bomb — it runs most of the fuse before it slows, about 260px in all. */
const CURLING_BOMB_DRAG = 0.9;
const CURLING_BOMB_BLAST_RADIUS = 110;
const CURLING_BOMB_DAMAGE = 35;
const CURLING_BOMB_STACKS = 2;
/** Every frost or void stack lasts this long... */
const FROST_STACK_MS = 8000;
/** ...plus this, for the rest of the match, on anyone a Curling Bomb has caught. */
const CURLING_BOMB_THAW_BONUS_MS = 2000;
/** Bot: the bomb is set down with the player this far away, and lit by the next spike. */
const NPC_BOMB_MIN_RANGE = 140;
const NPC_BOMB_MAX_RANGE = 420;

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
  /** True when the opponent is ice with Element Mastery on (a Nightmare bot or an online peer). */
  get npcMasteryActive(): boolean;
  /** The opponent's mastery bind over `slot`, or null — drives the bot's own Curling Bomb. */
  npcMasteryBindFor(slot: string): string | null;
  /** True when the opponent is driven by the local AI rather than replayed from a peer. */
  readonly npcAutonomous: boolean;
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
  /** Frost badges + turret ammo racks, wiped and repainted at the top of every `update`. */
  private hudG: Phaser.GameObjects.Graphics | null = null;
  private hudT = 0;

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

  // ── Ice Mastery — Curling Bomb ──────────────────────────────────────
  /** At most one bomb per owner; the npc entry exists for a bot's or an online peer's cast. */
  private curlingBombs: CurlingBomb[] = [];
  private curlingBombLastCastAt = -999999;
  private npcBombLastCastAt = -999999;
  /** Fighters a Curling Bomb has caught: their frost thaws 2s slower for the rest of the match. */
  private slowThaw = new WeakSet<Fighter>();

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

  /** 0 = just cast, 1 = ready. Drives the HUD bar when Curling Bomb is bound to a slot. */
  getCurlingBombCooldownRatio(time: number): number {
    return Math.min(1, (time - this.curlingBombLastCastAt) / CURLING_BOMB_COOLDOWN_MS);
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
    if (this.hudG) { this.hudG.destroy(); this.hudG = null; }
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
    this.curlingBombs.forEach((b) => b.gfx.destroy());
    this.curlingBombs = [];
    this.curlingBombLastCastAt = -999999;
    this.npcBombLastCastAt = -999999;
    this.slowThaw = new WeakSet();
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

    if (!this.hudG || !this.hudG.active) this.hudG = scene.add.graphics().setDepth(9.8);
    this.hudG.clear();
    this.hudT += delta / 1000;

    this.updateAvatars(delta, isPlayerIce, isNpcIce);
    this.updateSpikeTrails(delta);
    this.updateFrozenShells(time);
    // Owner-agnostic, so a bot's or an online peer's bomb runs on this sim too.
    this.updateCurlingBombs(time, delta);
    if (isNpcIce) this.updateNpcBomb(time);
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
              if (t.frostStacks < 5) t.frostStackTimers.push(Date.now() + this.stackMsFor(t));
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

    // Frost stack badges above every frosted fighter — a frosted chip with a drawn glyph
    // per stack kind, the count beside it. Painted into hudG (wiped at the top of update).
    for (const t of enemies) {
      if (!t.active) continue;
      t.frostVisual = this.stackLabel(t.frostVisual, t.frostStacks, t.x, t.y - 42, 'frost', t.alpha);
      t.permafrostVisual = this.stackLabel(t.permafrostVisual, t.permafrostStacks, t.x, t.y - 78, 'permafrost', t.alpha);
      t.permavoidVisual = this.stackLabel(t.permavoidVisual, t.permavoidStacks, t.x, t.y - 90, 'permavoid', t.alpha);
    }
    npc.voidFrostVisual = this.stackLabel(npc.voidFrostVisual, npc.voidFrostStacks, npc.x, npc.y - 54, 'voidfrost', npc.alpha);
    this.playerFrostVisual = this.stackLabel(this.playerFrostVisual, this.playerFrostStacks, player.x, player.y - 42, 'frost', player.alpha);
    this.playerPermafrostVisual = this.stackLabel(this.playerPermafrostVisual, player.permafrostStacks, player.x, player.y - 54, 'permafrost', player.alpha);
    this.playerPermavoidVisual = this.stackLabel(this.playerPermavoidVisual, player.permavoidStacks, player.x, player.y - 66, 'permavoid', player.alpha);

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

  /** How long a fresh stack lasts on `f`: 8s, or 10s for good once a Curling Bomb has caught them. */
  private stackMsFor(f: Fighter): number {
    return FROST_STACK_MS + (this.slowThaw.has(f) ? CURLING_BOMB_THAW_BONUS_MS : 0);
  }

  /** Ice Mastery requirement: deal over 50 damage in a single hit, 5 times. */
  private recordBigHit(amount: number): void {
    if (amount > BIG_HIT_THRESHOLD) this.arena.recordMasteryStat('bigHits', 1);
  }

  /**
   * Public: applies one frost (or void-frost) stack to any fighter — used by InvasionKit for husk
   * status effects. Defaults to whichever type Black Ice Morph implies; pass `forceVoid` to apply a
   * specific type regardless of morph state (used by Viral Frost to mirror the spreading source).
   */
  addFrostStackTo(f: Fighter, forceVoid?: boolean): void {
    // Ruin's Combo Breaker halves every meter in the game, and a frost stack is one — carried
    // rather than rounded, because each stack has a timer of its own that a fraction would
    // desync. The bar belongs to whoever is freezing them, which in every mode this kit runs
    // in is simply the other side.
    const froster = f === this.arena.player ? this.arena.npc : this.arena.player;
    if (meterStep(froster, 'frost') <= 0) return;
    const useVoid = forceVoid ?? this.playerBlackIceMorphActive;
    const stackMs = this.stackMsFor(f);
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
      if (this.playerFrostStacks < 5) this.playerFrostStackTimers.push(Date.now() + this.stackMsFor(player));
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
    this.slushNudgeCurlingBomb(baseAngle, range, halfAngleCos);

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
          const freshExpiry = Date.now() + this.stackMsFor(t);
          t.voidFrostStackTimers = t.voidFrostStackTimers.map(() => freshExpiry);
        }
      } else if (t.frostStackTimers.length > 0) {
        const freshExpiry = Date.now() + this.stackMsFor(t);
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

  // ── Ice Mastery: bound slot ─────────────────────────────────────────

  /**
   * Fires whichever mastery ability is bound over `slot` and reports whether the slot was
   * taken over — a bound slot swallows the keypress even on cooldown, so the base ability
   * never leaks through underneath it.
   */
  private castMasteryBind(slot: 'e' | 'r' | 'f' | 'q', time: number): boolean {
    if (!this.arena.masteryActive) return false;
    switch (this.arena.masteryBindFor(slot)) {
      case 'curling-bomb':
        this.tryCastCurlingBomb(time);
        return true;
      default: return false;
    }
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
      ammoLabel: scene.add.text(x + 30, y - 46, `0/${SNOW_AMMO_MAX}`, {
        fontSize: '10px', fontFamily: FONT_DISPLAY,
        color: '#e6f7ff', stroke: '#062338', strokeThickness: 3,
      }).setOrigin(0, 0.5).setDepth(12),
    });

    // It is thrown up out of the floor: a pillar of snow that packs itself down into a turret.
    const fx = this.fx(owner);
    fx.icePillar(x, y, 24, 66);
    fx.bloom(x, y, 42, 11, 4);
    fx.rime(x, y, 40, 1);
    scene.cameras.main.shake(120, 0.004);
    this.arena.showFloatingText(x, y - 62, '⛄ SNOW TURRET!', '#cceeff');
  }

  /**
   * Create/update/destroy one stack-count label and paint its badge: a frosted pill with a
   * glyph chip on the left — a snowflake for frost, an ice cube for permafrost, a void
   * crystal for permavoid, a dark-hearted void flake for void frost — and the count beside it.
   * Returns the (possibly new, possibly null) label for the caller to store back.
   */
  private stackLabel(
    cur: Phaser.GameObjects.Text | null, n: number, x: number, y: number, kind: StackKind, alpha: number,
  ): Phaser.GameObjects.Text | null {
    if (n <= 0) { cur?.destroy(); return null; }
    const isVoid = kind === 'permavoid' || kind === 'voidfrost';
    const txt = `×${n}`;
    if (!cur || !cur.active) {
      cur = this.arena.scene.add.text(x, y, txt, {
        fontSize: '11px', fontFamily: FONT_DISPLAY,
        color: isVoid ? '#f0d8ff' : '#e6f7ff', stroke: isVoid ? '#220044' : '#062338', strokeThickness: 3,
      }).setDepth(10);
    }
    cur.setOrigin(0, 0.5).setText(txt);
    const w = 20 + cur.width;
    const x0 = x - w / 2;
    cur.setPosition(x0 + 17, y).setAlpha(alpha);
    const g = this.hudG;
    if (!g || alpha <= 0.05) return cur;
    const c = this.pcol;
    const shell = isVoid ? ICE.voidDeep : ICE.abyss;
    const body = isVoid ? ICE.voidCore : ICE.deep;
    const rim = isVoid ? ICE.voidPale : ICE.frost;
    const glyph = isVoid ? ICE.voidPale : ICE.mist;
    const h = 15;
    g.fillStyle(0x000000, 0.3 * alpha);
    g.fillRoundedRect(x0 + 1, y - h / 2 + 2, w, h, h / 2);
    g.fillStyle(c(shell), 0.88 * alpha);
    g.fillRoundedRect(x0, y - h / 2, w, h, h / 2);
    g.fillStyle(c(body), 0.9 * alpha);
    g.fillRoundedRect(x0 + 1, y - h / 2 + 1, w - 2, h / 2, { tl: h / 2 - 1, tr: h / 2 - 1, bl: 0, br: 0 });
    g.lineStyle(1, c(rim), 0.8 * alpha);
    g.strokeRoundedRect(x0, y - h / 2, w, h, h / 2);
    // Rime frost crusting the bottom edge.
    g.fillStyle(c(isVoid ? ICE.voidBody : ICE.pale), 0.5 * alpha);
    for (let k = 0; k < 4; k++) g.fillTriangle(x0 + 8 + k * 6, y + h / 2 - 0.5, x0 + 11 + k * 6, y + h / 2 - 0.5, x0 + 9.5 + k * 6, y + h / 2 - 3);
    // Glyph chip.
    const ix = x0 + 8, iy = y;
    g.fillStyle(c(isVoid ? ICE.voidBody : ICE.steel), alpha);
    g.fillCircle(ix, iy, 6.2);
    const spin = this.hudT * 0.6;
    if (kind === 'frost' || kind === 'voidfrost') {
      g.lineStyle(1.2, c(glyph), alpha);
      for (let k = 0; k < 6; k++) {
        const a = spin + (k / 6) * Math.PI * 2;
        const ex = ix + Math.cos(a) * 4.6, ey = iy + Math.sin(a) * 4.6;
        g.lineBetween(ix, iy, ex, ey);
        const mx = ix + Math.cos(a) * 2.8, my = iy + Math.sin(a) * 2.8;
        g.lineBetween(mx, my, mx + Math.cos(a + 0.8) * 1.4, my + Math.sin(a + 0.8) * 1.4);
        g.lineBetween(mx, my, mx + Math.cos(a - 0.8) * 1.4, my + Math.sin(a - 0.8) * 1.4);
      }
      if (kind === 'voidfrost') { g.fillStyle(c(ICE.voidDeep), alpha); g.fillCircle(ix, iy, 1.8); }
    } else if (kind === 'permafrost') {
      // Isometric ice cube.
      g.fillStyle(c(ICE.pale), alpha);
      g.fillTriangle(ix, iy - 4.5, ix + 4, iy - 2.2, ix, iy);
      g.fillTriangle(ix, iy - 4.5, ix - 4, iy - 2.2, ix, iy);
      g.fillStyle(c(ICE.sky), alpha);
      g.fillTriangle(ix - 4, iy - 2.2, ix, iy, ix - 4, iy + 2.4);
      g.fillTriangle(ix, iy, ix, iy + 4.6, ix - 4, iy + 2.4);
      g.fillStyle(c(ICE.ice), alpha);
      g.fillTriangle(ix + 4, iy - 2.2, ix, iy, ix + 4, iy + 2.4);
      g.fillTriangle(ix, iy, ix, iy + 4.6, ix + 4, iy + 2.4);
    } else {
      // Void crystal: a tall faceted diamond with a glowing heart.
      g.fillStyle(c(ICE.voidGlow), alpha);
      g.fillTriangle(ix, iy - 5, ix + 3, iy, ix, iy + 5);
      g.fillStyle(c(ICE.voidPale), alpha);
      g.fillTriangle(ix, iy - 5, ix - 3, iy, ix, iy + 5);
      g.fillStyle(0xffffff, alpha * (0.5 + 0.5 * Math.sin(this.hudT * 4)));
      g.fillCircle(ix, iy, 1);
    }
    return cur;
  }

  /**
   * Snow turret ammo: a little ice tray hung over the turret with five sockets, each holding a
   * packed snowball while loaded, and a frost line along the tray filling as the next throw
   * readies.
   */
  private paintAmmoRack(x: number, y: number, ammo: number, ready: number, alpha: number, c: IceColorFn): void {
    const g = this.hudG;
    if (!g) return;
    const n = SNOW_AMMO_MAX, step = 9, w = n * step + 6, h = 13;
    const x0 = x - w / 2, y0 = y - h / 2;
    g.fillStyle(0x000000, 0.3 * alpha);
    g.fillRoundedRect(x0 + 1, y0 + 2, w, h, 5);
    g.fillStyle(c(ICE.abyss), 0.88 * alpha);
    g.fillRoundedRect(x0, y0, w, h, 5);
    g.lineStyle(1, c(ICE.frost), 0.75 * alpha);
    g.strokeRoundedRect(x0, y0, w, h, 5);
    for (let i = 0; i < n; i++) {
      const sx = x0 + 3 + step / 2 + i * step, sy = y - 0.5;
      // Socket.
      g.fillStyle(c(ICE.deep), alpha);
      g.fillCircle(sx, sy, 3.6);
      if (i < ammo) {
        const bob = i === ammo - 1 ? Math.sin(this.hudT * 6) * 0.5 : 0;
        g.fillStyle(c(ICE.pale), alpha);
        g.fillCircle(sx, sy + bob, 3.4);
        g.fillStyle(c(ICE.sky), alpha * 0.8);
        g.fillCircle(sx + 0.8, sy + 0.9 + bob, 2.2);
        g.fillStyle(c(ICE.white), alpha);
        g.fillCircle(sx - 1, sy - 1 + bob, 1.3);
      }
    }
    // Reload frost line under the sockets.
    g.fillStyle(c(ICE.teal), alpha);
    g.fillRect(x0 + 4, y0 + h - 2.6, w - 8, 1.6);
    g.fillStyle(c(ammo > 0 ? ICE.white : ICE.sky), alpha);
    g.fillRect(x0 + 4, y0 + h - 2.6, (w - 8) * ready, 1.6);
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
        {
          const left = turret.expiresAt - time;
          const fade = left < 1200 ? Math.max(0.15, left / 1200) : 1;
          this.paintAmmoRack(turret.x, turret.y - 46, turret.ammo, ready, fade, this.col(turret.owner));
          turret.ammoLabel?.setPosition(turret.x + 30, turret.y - 46).setText(`${turret.ammo}/${SNOW_AMMO_MAX}`).setAlpha(fade);
        }

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

  // ── Ice Mastery: Curling Bomb ───────────────────────────────────────

  private tryCastCurlingBomb(time: number): void {
    if (time - this.curlingBombLastCastAt < CURLING_BOMB_COOLDOWN_MS) return;
    this.curlingBombLastCastAt = time;
    const { player, scene } = this.arena;
    // triggerCooldown already broadcasts the cast id online; the peer replays via doNpcCurlingBomb.
    player.triggerCooldown('curling-bomb');
    const ptr = scene.input.activePointer;
    const angle = Math.atan2(ptr.worldY - player.y, ptr.worldX - player.x);
    // Both arms set it down in front — the bomb is placed, not thrown.
    this.playerAvatar?.play('raise', angle, 420);
    this.spawnCurlingBomb(player.x + Math.cos(angle) * 62, player.y + Math.sin(angle) * 62, 'player');
    this.arena.showFloatingText(
      player.x, player.y - 30, '💣 CURLING BOMB', this.playerBlackIceMorphActive ? '#cc88ff' : '#aaddff',
    );
  }

  /** Online replay and the bot's own cast: the opposing ice player set their bomb down. */
  doNpcCurlingBomb(tx: number, ty: number): void {
    const { npc } = this.arena;
    const angle = Math.atan2(ty - npc.y, tx - npc.x);
    this.npcAvatar?.play('raise', angle, 420);
    this.spawnCurlingBomb(npc.x + Math.cos(angle) * 62, npc.y + Math.sin(angle) * 62, 'npc');
  }

  /** The slot the bot's Curling Bomb is bound over, so the AI leaves that base ability alone. */
  npcBombSlot(): 'r' | 'f' | 'q' | undefined {
    if (!this.arena.npcMasteryActive) return undefined;
    for (const sl of ['r', 'f', 'q'] as const) {
      if (this.arena.npcMasteryBindFor(sl) === 'curling-bomb') return sl;
    }
    return undefined;
  }

  /**
   * Bot synergy — a shot through the bomb is a launch. Where the bot's next spike should go:
   * its own bomb, whenever the player stands beyond it inside a 35° cone, so the spike lights
   * the wick and sends the bomb on into them (or steers a lit one back onto them). Null when
   * there is no bomb or the line through it misses. Side-effect-free.
   */
  npcBombShotAim(): { x: number; y: number } | null {
    const bomb = this.curlingBombs.find((b) => b.owner === 'npc');
    if (!bomb) return null;
    const { npc, player } = this.arena;
    if (!player.active || player.hp <= 0) return null;
    const dBomb = Phaser.Math.Distance.Between(npc.x, npc.y, bomb.x, bomb.y);
    const dPlayer = Phaser.Math.Distance.Between(npc.x, npc.y, player.x, player.y);
    if (dPlayer <= dBomb + 20) return null;
    const toBomb = Math.atan2(bomb.y - npc.y, bomb.x - npc.x);
    const toPlayer = Math.atan2(player.y - npc.y, player.x - npc.x);
    if (Math.abs(Phaser.Math.Angle.Wrap(toPlayer - toBomb)) > Phaser.Math.DegToRad(35)) return null;
    return { x: bomb.x, y: bomb.y };
  }

  /** Nightmare bot: sets its bomb down ahead of itself when the player is in launch range. */
  private updateNpcBomb(time: number): void {
    if (!this.arena.npcAutonomous || !this.npcBombSlot()) return;
    if (time - this.npcBombLastCastAt < CURLING_BOMB_COOLDOWN_MS) return;
    const { npc, player } = this.arena;
    if (!npc.active || npc.hp <= 0 || !player.active || player.hp <= 0) return;
    if (this.curlingBombs.some((b) => b.owner === 'npc')) return;
    const d = Phaser.Math.Distance.Between(npc.x, npc.y, player.x, player.y);
    if (d < NPC_BOMB_MIN_RANGE || d > NPC_BOMB_MAX_RANGE) return;
    this.npcBombLastCastAt = time;
    // Stamped so the cast sounds like one; the bot has no peer to relay it to.
    npc.triggerCooldown('curling-bomb');
    this.doNpcCurlingBomb(player.x, player.y);
  }

  private spawnCurlingBomb(x: number, y: number, owner: 'player' | 'npc'): void {
    const { scene } = this.arena;
    // One bomb per owner — a fresh one replaces whatever is still sitting there.
    const existing = this.curlingBombs.findIndex((b) => b.owner === owner);
    if (existing >= 0) {
      this.curlingBombs[existing].gfx.destroy();
      this.curlingBombs.splice(existing, 1);
    }
    const wb = scene.physics.world.bounds;
    const isVoid = owner === 'player' && this.playerBlackIceMorphActive;
    const bx = Phaser.Math.Clamp(x, wb.x + CURLING_BOMB_RADIUS, wb.right - CURLING_BOMB_RADIUS);
    const by = Phaser.Math.Clamp(y, wb.y + CURLING_BOMB_RADIUS, wb.bottom - CURLING_BOMB_RADIUS);
    this.curlingBombs.push({
      gfx: scene.add.graphics().setDepth(5),
      x: bx, y: by, vx: 0, vy: 0, spin: 0, isVoid, owner,
      expiresAt: scene.time.now + CURLING_BOMB_LIFETIME_MS,
      detonateAt: null, struck: new WeakSet(), chipAccum: 0,
    });
    // It lands with weight: a crust of rime spidering out from underneath.
    const fx = this.fx(owner);
    fx.bloom(bx, by, 26, 8, 4, isVoid);
    fx.rime(bx, by, 28, 1, isVoid);
    scene.cameras.main.shake(110, 0.003);
  }

  /**
   * Light, slide, bounce, blow. Owner-agnostic: the player's bomb answers to their shots and
   * hurts the enemies, the opponent's bomb answers to theirs and hurts us.
   */
  private updateCurlingBombs(time: number, delta: number): void {
    if (this.curlingBombs.length === 0) return;
    const { scene } = this.arena;
    const wb = scene.physics.world.bounds;
    const dt = delta / 1000;

    for (let bi = this.curlingBombs.length - 1; bi >= 0; bi--) {
      const bomb = this.curlingBombs[bi];
      const tones = tonesFor(bomb.isVoid);
      const fx = this.fx(bomb.owner);

      if (bomb.detonateAt !== null && time >= bomb.detonateAt) {
        this.detonateCurlingBomb(bomb);
        bomb.gfx.destroy();
        this.curlingBombs.splice(bi, 1);
        continue;
      }
      if (bomb.detonateAt === null && time >= bomb.expiresAt) {
        // Never lit: it simply melts.
        fx.vapor(bomb.x, bomb.y, 5, 26, 4, bomb.isVoid);
        fx.shatter(bomb.x, bomb.y, 40, { shards: 8, vapor: 2, duration: 420, isVoid: bomb.isVoid });
        bomb.gfx.destroy();
        this.curlingBombs.splice(bi, 1);
        continue;
      }

      // Shots light it, and a later shot steers a lit bomb the way it was struck. A piercing
      // spike carries on through, but only counts once.
      for (const child of this.arena.projectiles.getChildren()) {
        const proj = child as Projectile;
        if (!proj.active || proj.isFromPlayer !== (bomb.owner === 'player')) continue;
        if (bomb.struck.has(proj)) continue;
        if (Phaser.Math.Distance.Between(proj.x, proj.y, bomb.x, bomb.y) > CURLING_BOMB_RADIUS + 8) continue;
        bomb.struck.add(proj);
        this.launchCurlingBomb(bomb, time, proj.x, proj.y, this.projAngle(proj));
      }

      const speed = Math.hypot(bomb.vx, bomb.vy);
      if (speed > 1) {
        bomb.x += bomb.vx * dt;
        bomb.y += bomb.vy * dt;
        bomb.spin += speed * dt * 0.03;
        const decay = Math.exp(-CURLING_BOMB_DRAG * dt);
        bomb.vx *= decay;
        bomb.vy *= decay;
        if (Math.hypot(bomb.vx, bomb.vy) < 6) { bomb.vx = 0; bomb.vy = 0; }
      }

      // Walls: it rebounds, losing a little on each rail.
      let bounced = false;
      if (bomb.x <= wb.x + CURLING_BOMB_RADIUS) {
        bomb.x = wb.x + CURLING_BOMB_RADIUS; bomb.vx = Math.abs(bomb.vx) * 0.86; bounced = true;
      } else if (bomb.x >= wb.right - CURLING_BOMB_RADIUS) {
        bomb.x = wb.right - CURLING_BOMB_RADIUS; bomb.vx = -Math.abs(bomb.vx) * 0.86; bounced = true;
      }
      if (bomb.y <= wb.y + CURLING_BOMB_RADIUS) {
        bomb.y = wb.y + CURLING_BOMB_RADIUS; bomb.vy = Math.abs(bomb.vy) * 0.86; bounced = true;
      } else if (bomb.y >= wb.bottom - CURLING_BOMB_RADIUS) {
        bomb.y = wb.bottom - CURLING_BOMB_RADIUS; bomb.vy = -Math.abs(bomb.vy) * 0.86; bounced = true;
      }
      if (bounced && speed > 60) {
        fx.shards(bomb.x, bomb.y, 5, {
          speed: 120, size: 2.8, life: 360, fall: 26, depth: 7, isVoid: bomb.isVoid,
        });
        fx.ring(bomb.x, bomb.y, 5, 28, tones.lit, 260, 3, 6);
      }

      // Sparks spitting off the wick while it burns, and chips off the back while it runs.
      if (bomb.detonateAt !== null) {
        bomb.chipAccum += delta;
        if (bomb.chipAccum >= 70) {
          bomb.chipAccum = 0;
          fx.shards(bomb.x, bomb.y - 20, 2, {
            angle: -Math.PI / 2, spread: 1.1, speed: 70, size: 1.8, life: 240, fall: -8, depth: 8, isVoid: bomb.isVoid,
          });
          if (speed > 30) {
            fx.shards(bomb.x, bomb.y + 6, 2, {
              angle: Math.atan2(-bomb.vy, -bomb.vx), spread: 0.5,
              speed: 70, size: 2.4, life: 320, fall: 12, depth: 4, isVoid: bomb.isVoid,
            });
          }
        }
      }

      const fuse = bomb.detonateAt === null ? -1 : 1 - Math.max(0, bomb.detonateAt - time) / CURLING_BOMB_FUSE_MS;
      const left = bomb.expiresAt - time;
      bomb.gfx.clear();
      IceFx.drawCurlingBomb(
        bomb.gfx, this.col(bomb.owner), tones,
        bomb.x, bomb.y, bomb.spin, time / 1000, fuse, bomb.isVoid,
        bomb.detonateAt === null && left < 1500 ? Math.max(0.2, left / 1500) : 1,
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
   * One shot's worth of launch. The first strike lights the wick and starts the fuse; every
   * strike sends the bomb off the way the shot was going. The bomb takes on whichever frost
   * its owner is throwing right now, so Black Ice turns it void mid-slide.
   */
  private launchCurlingBomb(bomb: CurlingBomb, time: number, hitX: number, hitY: number, angle: number): void {
    if (bomb.owner === 'player') bomb.isVoid = this.playerBlackIceMorphActive;
    const first = bomb.detonateAt === null;
    if (first) bomb.detonateAt = time + CURLING_BOMB_FUSE_MS;
    bomb.vx = Math.cos(angle) * CURLING_BOMB_LAUNCH_SPEED;
    bomb.vy = Math.sin(angle) * CURLING_BOMB_LAUNCH_SPEED;

    const tones = tonesFor(bomb.isVoid);
    const fx = this.fx(bomb.owner);
    this.arena.spawnHitFlash(hitX, hitY, bomb.isVoid ? ICE.voidGlow : ICE.frost);
    fx.shards(bomb.x, bomb.y, 5, {
      angle, spread: 0.7, speed: 110, size: 2.6, life: 340, fall: 24, depth: 7, isVoid: bomb.isVoid,
    });
    fx.ring(bomb.x, bomb.y, 6, 30, tones.lit, 260, 3, 6);
    if (first) {
      // The wick catches: a flare at the top of the bomb, not at the point of impact.
      fx.flash(bomb.x, bomb.y - 16, 12, 8, bomb.isVoid);
      if (bomb.owner === 'player') {
        this.arena.showFloatingText(bomb.x, bomb.y - 32, '🔥 LIT', bomb.isVoid ? '#cc88ff' : '#aaddff');
      }
    }
  }

  /** Click+ Slush Thrower has no projectile to strike with, so the spray itself lights and steers the bomb. */
  private slushNudgeCurlingBomb(baseAngle: number, range: number, halfAngleCos: number): void {
    const { player, scene } = this.arena;
    const bomb = this.curlingBombs.find((b) => b.owner === 'player');
    if (!bomb) return;
    const dist = Phaser.Math.Distance.Between(player.x, player.y, bomb.x, bomb.y);
    if (dist > range || dist < 1) return;
    const dot = (Math.cos(baseAngle) * (bomb.x - player.x) + Math.sin(baseAngle) * (bomb.y - player.y)) / dist;
    if (dot < halfAngleCos) return;
    this.launchCurlingBomb(bomb, scene.time.now, bomb.x, bomb.y, baseAngle);
  }

  /** The blast: damage, two stacks, and the slow thaw, on everyone inside the radius. */
  private detonateCurlingBomb(bomb: CurlingBomb): void {
    const { player, enemies, scene } = this.arena;
    const fx = this.fx(bomb.owner);
    const tones = tonesFor(bomb.isVoid);
    fx.flash(bomb.x, bomb.y, CURLING_BOMB_BLAST_RADIUS * 0.6, 8, bomb.isVoid);
    fx.shatter(bomb.x, bomb.y, CURLING_BOMB_BLAST_RADIUS * 0.8, {
      shards: 20, vapor: 4, duration: 560, isVoid: bomb.isVoid,
    });
    fx.ring(bomb.x, bomb.y, 10, CURLING_BOMB_BLAST_RADIUS * 1.15, tones.lit, 420, 5, 8);
    fx.rime(bomb.x, bomb.y, CURLING_BOMB_BLAST_RADIUS * 0.7, 1, bomb.isVoid);
    fx.vapor(bomb.x, bomb.y, 8, CURLING_BOMB_BLAST_RADIUS * 0.5, 4, bomb.isVoid);
    scene.cameras.main.shake(220, 0.007);

    const targets: Fighter[] = bomb.owner === 'player' ? enemies : [player];
    for (const t of targets) {
      if (!t.active || t.hp <= 0) continue;
      if (Phaser.Math.Distance.Between(bomb.x, bomb.y, t.x, t.y) > CURLING_BOMB_BLAST_RADIUS) continue;
      t.takeDamage(CURLING_BOMB_DAMAGE);
      this.arena.spawnHitFlash(t.x, t.y, bomb.isVoid ? ICE.voidGlow : ICE.sky);
      this.catchInBlast(t, bomb);
    }
  }

  /**
   * What the blast leaves on a fighter: every stack they already carry gets two more seconds,
   * every stack they are given from now on lasts ten instead of eight, and two fresh stacks of
   * the bomb's own frost land on top.
   */
  private catchInBlast(t: Fighter, bomb: CurlingBomb): void {
    const { player } = this.arena;
    this.slowThaw.add(t);
    if (t === player) {
      this.playerFrostStackTimers = this.playerFrostStackTimers.map((ts) => ts + CURLING_BOMB_THAW_BONUS_MS);
      for (let i = 0; i < CURLING_BOMB_STACKS; i++) this.addFrostStack('player');
    } else {
      t.frostStackTimers = t.frostStackTimers.map((ts) => ts + CURLING_BOMB_THAW_BONUS_MS);
      t.voidFrostStackTimers = t.voidFrostStackTimers.map((ts) => ts + CURLING_BOMB_THAW_BONUS_MS);
      for (let i = 0; i < CURLING_BOMB_STACKS; i++) this.addFrostStackTo(t, bomb.isVoid);
    }
    this.arena.showFloatingText(
      t.x, t.y - 34, bomb.isVoid ? '🖤 +2 · SLOW THAW' : '❄️ +2 · SLOW THAW', bomb.isVoid ? '#cc88ff' : '#aaddff',
    );
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
